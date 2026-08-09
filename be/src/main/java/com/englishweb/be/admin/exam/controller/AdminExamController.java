package com.englishweb.be.admin.exam.controller;

import com.englishweb.be.admin.exam.dto.AdminExamDtos.*;
import com.englishweb.be.admin.exam.service.AdminExamService;
import com.englishweb.be.admin.exam.service.AdminExamMediaService;
import com.englishweb.be.admin.exam.service.AdminExamImportService;
import com.englishweb.be.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ContentDisposition;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/admin/exams")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminExamController {
    private final AdminExamService service;
    private final AdminExamMediaService mediaService;
    private final AdminExamImportService importService;

    @GetMapping("/{type}/import-template")
    public ResponseEntity<byte[]> downloadImportTemplate(@PathVariable String type) {
        byte[] content = importService.generateTemplate(type);
        String filename = "exam-import-" + type.toLowerCase() + ".xlsx";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(filename, StandardCharsets.UTF_8).build().toString())
                .contentLength(content.length)
                .body(content);
    }

    @PostMapping(value = "/{type}/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ExamDetail>> importExam(@PathVariable String type,
            @RequestParam MultipartFile file,
            @RequestParam(required = false) List<MultipartFile> images) {
        return ResponseEntity.ok(ApiResponse.success("Import đề thi thành công",
                importService.importExam(type, file, images)));
    }

    @PostMapping("/{type}")
    public ResponseEntity<ApiResponse<ExamDetail>> create(@PathVariable String type,
            @Valid @RequestBody ExamCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Tạo đề thi thành công", service.create(type, request)));
    }

    @GetMapping("/{type}")
    public ResponseEntity<ApiResponse<PageResponse<ExamSummary>>> list(
            @PathVariable String type,
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đề thi thành công",
                service.list(type, keyword, status, sort, page, size)));
    }

    @GetMapping("/{type}/{id}")
    public ResponseEntity<ApiResponse<ExamDetail>> detail(@PathVariable String type, @PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết đề thi thành công", service.detail(type, id)));
    }

    @PutMapping("/{type}/{id}")
    public ResponseEntity<ApiResponse<ExamDetail>> updateExam(@PathVariable String type, @PathVariable Integer id,
                                                               @Valid @RequestBody ExamUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đề thi thành công", service.updateExam(type, id, request)));
    }

    @PatchMapping("/{type}/{id}/status")
    public ResponseEntity<ApiResponse<ExamSummary>> updateStatus(@PathVariable String type, @PathVariable Integer id,
                                                                  @Valid @RequestBody StatusUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái thành công", service.updateStatus(type, id, request)));
    }

    @PutMapping("/{type}/{examId}/{resource}/{recordId}")
    public ResponseEntity<ApiResponse<ExamDetail>> updateContent(@PathVariable String type,
            @PathVariable Integer examId, @PathVariable String resource, @PathVariable Integer recordId,
            @RequestBody ContentUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật nội dung thành công",
                service.updateContent(type, examId, resource, recordId, request)));
    }

    @PostMapping("/{type}/{examId}/{resource}")
    public ResponseEntity<ApiResponse<ExamDetail>> addContent(@PathVariable String type,
            @PathVariable Integer examId, @PathVariable String resource,
            @RequestBody ContentCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Thêm nội dung thành công",
                service.addContent(type, examId, resource, request)));
    }

    @DeleteMapping("/{type}/{examId}/{resource}/{recordId}")
    public ResponseEntity<ApiResponse<ExamDetail>> deleteContent(@PathVariable String type,
            @PathVariable Integer examId, @PathVariable String resource, @PathVariable Integer recordId) {
        return ResponseEntity.ok(ApiResponse.success("Xóa nội dung thành công",
                service.deleteContent(type, examId, resource, recordId)));
    }

    @PostMapping(value = "/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<MediaUploadResponse>> uploadMedia(
            @RequestParam MultipartFile file, @RequestParam String resourceType) {
        return ResponseEntity.ok(ApiResponse.success("Tải media lên thành công",
                mediaService.upload(file, resourceType)));
    }

    @DeleteMapping("/{type}/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String type, @PathVariable Integer id) {
        service.delete(type, id);
        return ResponseEntity.ok(ApiResponse.success("Xóa đề thi thành công", null));
    }
}
