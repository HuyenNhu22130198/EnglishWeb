package com.englishweb.be.admin.exam.service;

import com.englishweb.be.admin.exam.dto.AdminExamDtos.ExamDetail;
import com.englishweb.be.admin.exam.dto.AdminExamDtos.ContentCreateRequest;
import com.englishweb.be.admin.exam.dto.AdminExamDtos.MediaUploadResponse;
import com.englishweb.be.exception.ExamImportValidationException;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminExamImportServiceTest {
    private AdminExamService examService;
    private AdminExamMediaService mediaService;
    private PlatformTransactionManager transactionManager;
    private AdminExamImportService service;

    @BeforeEach
    void setUp() {
        examService = mock(AdminExamService.class);
        mediaService = mock(AdminExamMediaService.class);
        transactionManager = mock(PlatformTransactionManager.class);
        when(transactionManager.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
        service = new AdminExamImportService(examService, mediaService, transactionManager);
    }

    @Test
    void generatedTemplatesContainEverySheetAndExampleRow() throws Exception {
        assertTemplate("toeic", List.of("Exam", "Groups", "Materials", "Questions", "Options", "HuongDan"));
        assertTemplate("ielts", List.of("Exam", "Groups", "Blocks", "Questions", "Options", "Answers", "Media",
                "WritingTasks", "WritingSamples", "SpeakingTasks", "SpeakingItems", "SpeakingSamples", "HuongDan"));
    }

    @Test
    void validToeicTemplateCreatesTreeAndLoadsDetailOnce() {
        byte[] content = service.generateTemplate("toeic");
        ExamDetail expected = mock(ExamDetail.class);
        AtomicInteger ids = new AtomicInteger(100);
        when(examService.createForImport(eq("toeic"), any())).thenReturn(10);
        when(examService.addContentForImport(eq("toeic"), eq(10), anyString(), any()))
                .thenAnswer(invocation -> ids.incrementAndGet());
        when(examService.detail("toeic", 10)).thenReturn(expected);

        ExamDetail result = service.importExam("toeic", file(content), List.of());

        assertSame(expected, result);
        verify(examService).createForImport(eq("toeic"), any());
        verify(examService, times(4)).addContentForImport(eq("toeic"), eq(10), anyString(), any());
        verify(examService, times(1)).detail("toeic", 10);
    }

    @Test
    void invalidFileReturnsAllErrorsWithoutWritingDatabase() throws Exception {
        byte[] content = service.generateTemplate("toeic");
        byte[] invalidContent;
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content));
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            workbook.getSheet("Questions").getRow(1).getCell(1).setCellValue("UNKNOWN_GROUP");
            workbook.getSheet("Questions").getRow(1).getCell(5).setCellValue("Z");
            workbook.getSheet("Options").getRow(1).getCell(0).setCellValue("UNKNOWN_QUESTION");
            workbook.write(output);
            invalidContent = output.toByteArray();
        }

        ExamImportValidationException exception = assertThrows(ExamImportValidationException.class,
                () -> service.importExam("toeic", file(invalidContent), List.of()));

        assertTrue(exception.getErrors().size() >= 3);
        assertTrue(exception.getErrors().stream().anyMatch(error -> error.sheet().equals("Questions") && error.row() == 2));
        assertTrue(exception.getErrors().stream().anyMatch(error -> error.message().contains("correctOption")));
        verify(examService, never()).createForImport(anyString(), any());
        verify(examService, never()).addContentForImport(anyString(), anyInt(), anyString(), any());
    }

    @Test
    void referencedFileIsUploadedOnceAndUrlIsReused() throws Exception {
        byte[] content = updateToeicTemplate(workbook -> {
            workbook.getSheet("Materials").getRow(1).getCell(3).setCellValue("Shared.JPG");
            workbook.getSheet("Questions").getRow(1).getCell(4).setCellValue("shared.jpg");
        });
        MockMultipartFile asset = new MockMultipartFile("images", "shared.jpg", "image/jpeg", new byte[]{1,2,3});
        when(mediaService.upload(asset, "image")).thenReturn(new MediaUploadResponse("https://cdn.example/shared.jpg", "exam/shared"));
        when(examService.createForImport(eq("toeic"), any())).thenReturn(10);
        when(examService.addContentForImport(eq("toeic"), eq(10), anyString(), any()))
                .thenAnswer(invocation -> 100 + invocation.getArgument(2, String.class).length());

        service.importExam("toeic", file(content), List.of(asset));

        verify(mediaService, times(1)).upload(asset, "image");
        var order = inOrder(mediaService, transactionManager, examService);
        order.verify(mediaService).upload(asset, "image");
        order.verify(transactionManager).getTransaction(any());
        order.verify(examService).createForImport(eq("toeic"), any());
        var requestCaptor = org.mockito.ArgumentCaptor.forClass(ContentCreateRequest.class);
        verify(examService, times(4)).addContentForImport(eq("toeic"), eq(10), anyString(), requestCaptor.capture());
        assertEquals(2, requestCaptor.getAllValues().stream()
                .filter(request -> "https://cdn.example/shared.jpg".equals(request.assetUrl())
                        || "https://cdn.example/shared.jpg".equals(request.imageUrl())).count());
    }

    @Test
    void missingReferencedFileIsReportedBeforeUploadOrTransaction() throws Exception {
        byte[] content = updateToeicTemplate(workbook ->
                workbook.getSheet("Questions").getRow(1).getCell(4).setCellValue("missing.jpg"));

        ExamImportValidationException exception = assertThrows(ExamImportValidationException.class,
                () -> service.importExam("toeic", file(content), List.of()));

        assertTrue(exception.getErrors().stream().anyMatch(error -> error.sheet().equals("Questions")
                && error.row() == 2 && error.message().contains("missing.jpg")));
        verifyNoInteractions(mediaService);
        verify(transactionManager, never()).getTransaction(any());
        verify(examService, never()).createForImport(anyString(), any());
    }

    @Test
    void duplicateAttachedNamesAreRejectedCaseInsensitively() {
        MockMultipartFile first = new MockMultipartFile("images", "Q1.jpg", "image/jpeg", new byte[]{1});
        MockMultipartFile second = new MockMultipartFile("images", "q1.JPG", "image/jpeg", new byte[]{2});

        ExamImportValidationException exception = assertThrows(ExamImportValidationException.class,
                () -> service.importExam("toeic", file(service.generateTemplate("toeic")), List.of(first, second)));

        assertTrue(exception.getErrors().stream().anyMatch(error -> error.message().contains("bị trùng")));
        verifyNoInteractions(mediaService);
        verify(transactionManager, never()).getTransaction(any());
    }

    private void assertTemplate(String type, List<String> sheetNames) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(service.generateTemplate(type)))) {
            assertEquals(sheetNames.size(), workbook.getNumberOfSheets());
            for (String name : sheetNames) {
                assertNotNull(workbook.getSheet(name));
                assertNotNull(workbook.getSheet(name).getRow(0));
                if (!name.equals("HuongDan")) assertNotNull(workbook.getSheet(name).getRow(1));
            }
        }
    }

    private MockMultipartFile file(byte[] content) {
        return new MockMultipartFile("file", "exam.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content);
    }

    private byte[] updateToeicTemplate(WorkbookEditor editor) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(service.generateTemplate("toeic")));
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            editor.edit(workbook);
            workbook.write(output);
            return output.toByteArray();
        }
    }

    @FunctionalInterface
    private interface WorkbookEditor { void edit(Workbook workbook) throws Exception; }
}
