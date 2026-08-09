package com.englishweb.be.admin.exam.service;

import com.englishweb.be.admin.exam.dto.AdminExamDtos.ContentCreateRequest;
import com.englishweb.be.admin.exam.dto.AdminExamDtos.ExamCreateRequest;
import com.englishweb.be.admin.exam.dto.AdminExamDtos.ExamDetail;
import com.englishweb.be.admin.exam.dto.AdminExamDtos.ImportError;
import com.englishweb.be.exception.ExamImportValidationException;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminExamImportService {
    private static final Set<String> STATUSES = Set.of("draft", "published", "active", "ready", "hidden");
    private static final List<SheetSpec> TOEIC_SHEETS = List.of(
            spec("Exam", arr("examCode","examName","status","listeningAudioUrl"), arr("TOEIC-DEMO-01","TOEIC Demo","draft","https://example.com/toeic-listening.mp3")),
            spec("Groups", arr("GroupRef","section","partNo","groupNo","groupType","title","instruction","sharedText"), arr("G1","LISTENING","1","1","SINGLE","Part 1","Choose the best answer","")),
            spec("Materials", arr("GroupRef","materialType","content","assetUrl","displayOrder"), arr("G1","audio","Audio for Part 1","https://example.com/part-1.mp3","1")),
            spec("Questions", arr("QuestionRef","GroupRef","questionNo","questionText","imageUrl","correctOption","explanation","transcript","displayOrder"), arr("Q1","G1","1","What is shown in the picture?","https://example.com/q1.jpg","A","Option A best describes the picture.","Look at the picture.","1")),
            spec("Options", arr("QuestionRef","optionLabel","optionText","displayOrder"), arr("Q1","A","A person is working.","1")));
    private static final List<SheetSpec> IELTS_SHEETS = List.of(
            spec("Exam", arr("examCode","examName","status"), arr("IELTS-DEMO-01","IELTS Demo","draft")),
            spec("Groups", arr("GroupRef","skill","partNo","groupNo","title","instruction","sharedText","displayOrder"), arr("G1","LISTENING","1","1","Listening Part 1","Complete the form","Conversation transcript","1")),
            spec("Blocks", arr("BlockRef","GroupRef","blockNo","questionType","instruction","maxAnswers","answerFormat","displayOrder"), arr("B1","G1","1","FILL_BLANK","Write ONE WORD ONLY","1","ONE_WORD","1")),
            spec("Questions", arr("QuestionRef","BlockRef","questionNo","promptText","explanation","displayOrder"), arr("Q1","B1","1","Name: ____","The speaker states the name.","1")),
            spec("Options", arr("QuestionRef","optionKey","optionText","displayOrder"), arr("Q1","A","John","1")),
            spec("Answers", arr("QuestionRef","answerKey","answerText"), arr("Q1","A","John")),
            spec("Media", arr("skill","partNo","assetType","assetUrl","displayOrder"), arr("LISTENING","1","audio","https://example.com/ielts-listening.mp3","1")),
            spec("WritingTasks", arr("TaskRef","taskNo","taskType","instruction","promptText","minWords","displayOrder"), arr("WT1","1","TASK_1","Write at least 150 words.","Describe the chart.","150","1")),
            spec("WritingSamples", arr("TaskRef","answerText","displayOrder"), arr("WT1","This chart illustrates an upward trend...","1")),
            spec("SpeakingTasks", arr("SpeakingRef","partNo","topicTitle","instruction","displayOrder"), arr("ST1","1","Home","Answer the questions.","1")),
            spec("SpeakingItems", arr("SpeakingRef","contentText","displayOrder"), arr("ST1","Where do you live?","1")),
            spec("SpeakingSamples", arr("SpeakingRef","segmentTitle","answerText","displayOrder"), arr("ST1","Sample answer","I live in a small city.","1")));

    private final AdminExamService examService;
    private final AdminExamMediaService mediaService;
    private final PlatformTransactionManager transactionManager;

    public byte[] generateTemplate(String rawType) {
        String type = type(rawType);
        List<SheetSpec> specs = type.equals("toeic") ? TOEIC_SHEETS : IELTS_SHEETS;
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            CellStyle header = headerStyle(workbook);
            CellStyle example = exampleStyle(workbook);
            for (SheetSpec spec : specs) createDataSheet(workbook, spec, header, example);
            createGuide(workbook, type, header);
            workbook.setActiveSheet(0);
            workbook.write(output);
            return output.toByteArray();
        } catch (Exception exception) {
            throw new RuntimeException("Không thể tạo file mẫu Excel.", exception);
        }
    }

    public ExamDetail importExam(String rawType, MultipartFile file, List<MultipartFile> assetFiles) {
        String type = type(rawType);
        List<ImportError> errors = new ArrayList<>();
        Map<String, MultipartFile> attachedFiles = attachedFiles(assetFiles, errors);
        if (file == null || file.isEmpty()) throw invalid("File", 0, "Vui lòng chọn file .xlsx để import.");
        String filename = Objects.toString(file.getOriginalFilename(), "").toLowerCase(Locale.ROOT);
        if (!filename.endsWith(".xlsx")) throw invalid("File", 0, "Chỉ hỗ trợ file Excel định dạng .xlsx.");

        Map<String, List<ParsedRow>> sheets = new LinkedHashMap<>();
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            for (SheetSpec spec : type.equals("toeic") ? TOEIC_SHEETS : IELTS_SHEETS) {
                sheets.put(spec.name(), readSheet(workbook, spec, errors));
            }
        } catch (ExamImportValidationException exception) {
            throw exception;
        } catch (Exception exception) {
            throw invalid("File", 0, "Không thể đọc workbook .xlsx: " + safeMessage(exception));
        }

        validate(type, sheets, errors);
        Set<String> referencedFiles = validateMediaReferences(type, sheets, attachedFiles, errors);
        if (!errors.isEmpty()) throw new ExamImportValidationException(errors);

        Map<String, String> uploadedUrls = uploadReferencedFiles(referencedFiles, attachedFiles);

        ParsedRow examRow = sheets.get("Exam").get(0);
        ExamCreateRequest examRequest = new ExamCreateRequest(examRow.get("examCode"), examRow.get("examName"),
                examRow.get("status"), resolveMedia(examRow.get("listeningAudioUrl"), uploadedUrls));
        return new TransactionTemplate(transactionManager).execute(status -> {
            Integer examId = examService.createForImport(type, examRequest);
            if (type.equals("toeic")) insertToeic(examId, sheets, uploadedUrls);
            else insertIelts(examId, sheets, uploadedUrls);
            return examService.detail(type, examId);
        });
    }

    private void insertToeic(Integer examId, Map<String, List<ParsedRow>> sheets, Map<String, String> uploadedUrls) {
        Map<String, Integer> groups = new HashMap<>();
        Map<String, Integer> questions = new HashMap<>();
        for (ParsedRow row : sheets.get("Groups")) {
            Values v = new Values(); v.skill=row.get("section"); v.partNo=num(row,"partNo"); v.groupNo=num(row,"groupNo");
            v.type=row.get("groupType"); v.title=row.get("title"); v.instruction=row.get("instruction"); v.sharedText=row.get("sharedText");
            groups.put(row.get("GroupRef"), examService.addContentForImport("toeic", examId, "groups", v.request()));
        }
        for (ParsedRow row : sheets.get("Materials")) {
            Values v = new Values(); v.parentId=groups.get(row.get("GroupRef")); v.type=row.get("materialType");
            v.content=row.get("content"); v.assetUrl=resolveMedia(row.get("assetUrl"),uploadedUrls); v.displayOrder=num(row,"displayOrder");
            examService.addContentForImport("toeic", examId, "materials", v.request());
        }
        for (ParsedRow row : sheets.get("Questions")) {
            Values v = new Values(); v.parentId=groups.get(row.get("GroupRef")); v.questionNo=num(row,"questionNo");
            v.questionText=row.get("questionText"); v.imageUrl=resolveMedia(row.get("imageUrl"),uploadedUrls); v.correctAnswer=row.get("correctOption");
            v.explanation=row.get("explanation"); v.transcript=row.get("transcript"); v.displayOrder=num(row,"displayOrder");
            questions.put(row.get("QuestionRef"), examService.addContentForImport("toeic", examId, "questions", v.request()));
        }
        for (ParsedRow row : sheets.get("Options")) {
            Values v = new Values(); v.parentId=questions.get(row.get("QuestionRef")); v.optionLabel=row.get("optionLabel");
            v.text=row.get("optionText"); v.displayOrder=num(row,"displayOrder");
            examService.addContentForImport("toeic", examId, "options", v.request());
        }
    }

    private void insertIelts(Integer examId, Map<String, List<ParsedRow>> sheets, Map<String, String> uploadedUrls) {
        Map<String, Integer> groups = new HashMap<>(), blocks = new HashMap<>(), questions = new HashMap<>();
        Map<String, Integer> writing = new HashMap<>(), speaking = new HashMap<>();
        for (ParsedRow row : sheets.get("Groups")) {
            Values v=new Values(); v.skill=row.get("skill"); v.partNo=num(row,"partNo"); v.groupNo=num(row,"groupNo");
            v.title=row.get("title"); v.instruction=row.get("instruction"); v.sharedText=row.get("sharedText"); v.displayOrder=num(row,"displayOrder");
            groups.put(row.get("GroupRef"), examService.addContentForImport("ielts",examId,"groups",v.request()));
        }
        for (ParsedRow row : sheets.get("Blocks")) {
            Values v=new Values(); v.parentId=groups.get(row.get("GroupRef")); v.blockNo=num(row,"blockNo"); v.type=row.get("questionType");
            v.instruction=row.get("instruction"); v.maxAnswers=num(row,"maxAnswers"); v.label=row.get("answerFormat"); v.displayOrder=num(row,"displayOrder");
            blocks.put(row.get("BlockRef"), examService.addContentForImport("ielts",examId,"blocks",v.request()));
        }
        for (ParsedRow row : sheets.get("Questions")) {
            Values v=new Values(); v.parentId=blocks.get(row.get("BlockRef")); v.questionNo=num(row,"questionNo");
            v.promptText=row.get("promptText"); v.explanation=row.get("explanation"); v.displayOrder=num(row,"displayOrder");
            questions.put(row.get("QuestionRef"), examService.addContentForImport("ielts",examId,"questions",v.request()));
        }
        for (ParsedRow row : sheets.get("Options")) {
            Values v=new Values(); v.parentId=questions.get(row.get("QuestionRef")); v.optionKey=row.get("optionKey"); v.text=row.get("optionText"); v.displayOrder=num(row,"displayOrder");
            examService.addContentForImport("ielts",examId,"options",v.request());
        }
        for (ParsedRow row : sheets.get("Answers")) {
            Values v=new Values(); v.parentId=questions.get(row.get("QuestionRef")); v.answerKey=row.get("answerKey"); v.answerText=row.get("answerText");
            examService.addContentForImport("ielts",examId,"answers",v.request());
        }
        for (ParsedRow row : sheets.get("Media")) {
            Values v=new Values(); v.skill=row.get("skill"); v.partNo=num(row,"partNo"); v.type=row.get("assetType"); v.assetUrl=resolveMedia(row.get("assetUrl"),uploadedUrls); v.displayOrder=num(row,"displayOrder");
            examService.addContentForImport("ielts",examId,"media",v.request());
        }
        for (ParsedRow row : sheets.get("WritingTasks")) {
            Values v=new Values(); v.taskNo=num(row,"taskNo"); v.type=row.get("taskType"); v.instruction=row.get("instruction"); v.promptText=row.get("promptText"); v.minWords=num(row,"minWords"); v.displayOrder=num(row,"displayOrder");
            writing.put(row.get("TaskRef"), examService.addContentForImport("ielts",examId,"writing-tasks",v.request()));
        }
        for (ParsedRow row : sheets.get("WritingSamples")) {
            Values v=new Values(); v.parentId=writing.get(row.get("TaskRef")); v.answerText=row.get("answerText"); v.displayOrder=num(row,"displayOrder");
            examService.addContentForImport("ielts",examId,"writing-samples",v.request());
        }
        for (ParsedRow row : sheets.get("SpeakingTasks")) {
            Values v=new Values(); v.partNo=num(row,"partNo"); v.topicTitle=row.get("topicTitle"); v.instruction=row.get("instruction"); v.displayOrder=num(row,"displayOrder");
            speaking.put(row.get("SpeakingRef"), examService.addContentForImport("ielts",examId,"speaking-tasks",v.request()));
        }
        for (ParsedRow row : sheets.get("SpeakingItems")) {
            Values v=new Values(); v.parentId=speaking.get(row.get("SpeakingRef")); v.text=row.get("contentText"); v.displayOrder=num(row,"displayOrder");
            examService.addContentForImport("ielts",examId,"speaking-items",v.request());
        }
        for (ParsedRow row : sheets.get("SpeakingSamples")) {
            Values v=new Values(); v.parentId=speaking.get(row.get("SpeakingRef")); v.title=row.get("segmentTitle"); v.answerText=row.get("answerText"); v.displayOrder=num(row,"displayOrder");
            examService.addContentForImport("ielts",examId,"speaking-samples",v.request());
        }
    }

    private Map<String, MultipartFile> attachedFiles(List<MultipartFile> assetFiles, List<ImportError> errors) {
        Map<String, MultipartFile> result = new LinkedHashMap<>();
        if (assetFiles == null) return result;
        for (int index = 0; index < assetFiles.size(); index++) {
            MultipartFile file = assetFiles.get(index);
            String name = file == null ? "" : Objects.toString(file.getOriginalFilename(), "").trim();
            if (file == null || file.isEmpty() || name.isBlank()) {
                errors.add(new ImportError("Files", index + 1, "File đính kèm không có dữ liệu hoặc tên file hợp lệ."));
                continue;
            }
            String key = name.toLowerCase(Locale.ROOT);
            if (result.containsKey(key)) {
                errors.add(new ImportError("Files", index + 1, "Tên file đính kèm bị trùng: " + name));
            } else {
                result.put(key, file);
            }
        }
        return result;
    }

    private Set<String> validateMediaReferences(String type, Map<String, List<ParsedRow>> sheets,
            Map<String, MultipartFile> attachedFiles, List<ImportError> errors) {
        Set<String> referenced = new LinkedHashSet<>();
        if (type.equals("toeic")) {
            mediaReference(sheets.get("Exam"), "listeningAudioUrl", attachedFiles, referenced, errors);
            mediaReference(sheets.get("Materials"), "assetUrl", attachedFiles, referenced, errors);
            mediaReference(sheets.get("Questions"), "imageUrl", attachedFiles, referenced, errors);
        } else {
            mediaReference(sheets.get("Media"), "assetUrl", attachedFiles, referenced, errors);
        }
        return referenced;
    }

    private void mediaReference(List<ParsedRow> rows, String column, Map<String, MultipartFile> attachedFiles,
            Set<String> referenced, List<ImportError> errors) {
        for (ParsedRow row : rows) {
            String value = row.get(column);
            if (value.isBlank() || isHttpUrl(value)) continue;
            String key = value.toLowerCase(Locale.ROOT);
            MultipartFile file = attachedFiles.get(key);
            if (file == null) {
                error(row, errors, "Không tìm thấy file đính kèm tên " + value);
                continue;
            }
            String contentType = Objects.toString(file.getContentType(), "").toLowerCase(Locale.ROOT);
            if (!contentType.startsWith("image/") && !contentType.startsWith("audio/")) {
                error(row, errors, "Định dạng file không hỗ trợ: " + value);
                continue;
            }
            referenced.add(key);
        }
    }

    private Map<String, String> uploadReferencedFiles(Set<String> referencedFiles,
            Map<String, MultipartFile> attachedFiles) {
        Map<String, String> urls = new HashMap<>();
        for (String name : referencedFiles) {
            MultipartFile file = attachedFiles.get(name);
            String contentType = Objects.toString(file.getContentType(), "").toLowerCase(Locale.ROOT);
            String resourceType = contentType.startsWith("image/") ? "image" : "audio";
            urls.put(name, mediaService.upload(file, resourceType).url());
        }
        return urls;
    }

    private String resolveMedia(String value, Map<String, String> uploadedUrls) {
        if (value == null || value.isBlank() || isHttpUrl(value)) return value;
        return uploadedUrls.get(value.toLowerCase(Locale.ROOT));
    }

    private boolean isHttpUrl(String value) {
        String normalized = Objects.toString(value, "").toLowerCase(Locale.ROOT);
        return normalized.startsWith("http://") || normalized.startsWith("https://");
    }

    private void validate(String type, Map<String, List<ParsedRow>> sheets, List<ImportError> errors) {
        List<ParsedRow> exams = sheets.getOrDefault("Exam", List.of());
        if (exams.size() != 1) errors.add(new ImportError("Exam", 2, "Sheet Exam phải có đúng 1 dòng dữ liệu."));
        for (ParsedRow row : exams) {
            require(row, errors, "examCode", "examCode không được để trống.");
            require(row, errors, "examName", "examName không được để trống.");
            require(row, errors, "status", "status không được để trống.");
            if (!row.get("status").isBlank() && !STATUSES.contains(row.get("status").toLowerCase(Locale.ROOT))) error(row,errors,"status không hợp lệ.");
            if (type.equals("toeic")) require(row, errors, "listeningAudioUrl", "listeningAudioUrl không được để trống.");
            if (!row.get("examCode").isBlank()) {
                try { if (examService.examCodeExists(type,row.get("examCode"))) error(row,errors,"examCode đã tồn tại."); }
                catch (RuntimeException exception) { error(row,errors,exception.getMessage()); }
            }
        }
        if (type.equals("toeic")) validateToeic(sheets, errors); else validateIelts(sheets, errors);
    }

    private void validateToeic(Map<String, List<ParsedRow>> s, List<ImportError> errors) {
        Set<String> groups=refs(s.get("Groups"),"GroupRef",errors), questions=refs(s.get("Questions"),"QuestionRef",errors);
        for (ParsedRow r:s.get("Groups")) { require(r,errors,"section","section không được để trống."); require(r,errors,"groupType","groupType không được để trống."); enumValue(r,errors,"section",Set.of("LISTENING","READING")); ints(r,errors,"partNo","groupNo"); }
        for (ParsedRow r:s.get("Materials")) { parent(r,errors,"GroupRef",groups,"Groups"); require(r,errors,"materialType","materialType không được để trống."); ints(r,errors,"displayOrder"); }
        for (ParsedRow r:s.get("Questions")) { parent(r,errors,"GroupRef",groups,"Groups"); require(r,errors,"correctOption","correctOption không được để trống."); enumValue(r,errors,"correctOption",Set.of("A","B","C","D")); ints(r,errors,"questionNo","displayOrder"); }
        for (ParsedRow r:s.get("Options")) { parent(r,errors,"QuestionRef",questions,"Questions"); require(r,errors,"optionText","optionText không được để trống."); enumValue(r,errors,"optionLabel",Set.of("A","B","C","D")); ints(r,errors,"displayOrder"); }
    }

    private void validateIelts(Map<String, List<ParsedRow>> s, List<ImportError> errors) {
        Set<String> groups=refs(s.get("Groups"),"GroupRef",errors), blocks=refs(s.get("Blocks"),"BlockRef",errors), questions=refs(s.get("Questions"),"QuestionRef",errors);
        Set<String> writing=refs(s.get("WritingTasks"),"TaskRef",errors), speaking=refs(s.get("SpeakingTasks"),"SpeakingRef",errors);
        for(ParsedRow r:s.get("Groups")){ require(r,errors,"skill","skill không được để trống."); enumValue(r,errors,"skill",Set.of("LISTENING","READING")); ints(r,errors,"partNo","groupNo","displayOrder"); }
        for(ParsedRow r:s.get("Blocks")){ parent(r,errors,"GroupRef",groups,"Groups"); require(r,errors,"questionType","questionType không được để trống."); ints(r,errors,"blockNo","maxAnswers","displayOrder"); }
        for(ParsedRow r:s.get("Questions")){ parent(r,errors,"BlockRef",blocks,"Blocks"); ints(r,errors,"questionNo","displayOrder"); }
        for(ParsedRow r:s.get("Options")){ parent(r,errors,"QuestionRef",questions,"Questions"); require(r,errors,"optionText","optionText không được để trống."); ints(r,errors,"displayOrder"); }
        for(ParsedRow r:s.get("Answers")){ parent(r,errors,"QuestionRef",questions,"Questions"); require(r,errors,"answerText","answerText không được để trống."); }
        for(ParsedRow r:s.get("Media")){ require(r,errors,"assetType","assetType không được để trống."); require(r,errors,"assetUrl","assetUrl không được để trống."); ints(r,errors,"partNo","displayOrder"); }
        for(ParsedRow r:s.get("WritingTasks")){ require(r,errors,"taskType","taskType không được để trống."); require(r,errors,"instruction","instruction không được để trống."); require(r,errors,"promptText","promptText không được để trống."); ints(r,errors,"taskNo","minWords","displayOrder"); }
        for(ParsedRow r:s.get("WritingSamples")){ parent(r,errors,"TaskRef",writing,"WritingTasks"); require(r,errors,"answerText","answerText không được để trống."); ints(r,errors,"displayOrder"); }
        for(ParsedRow r:s.get("SpeakingTasks")){ ints(r,errors,"partNo","displayOrder"); }
        for(ParsedRow r:s.get("SpeakingItems")){ parent(r,errors,"SpeakingRef",speaking,"SpeakingTasks"); require(r,errors,"contentText","contentText không được để trống."); ints(r,errors,"displayOrder"); }
        for(ParsedRow r:s.get("SpeakingSamples")){ parent(r,errors,"SpeakingRef",speaking,"SpeakingTasks"); require(r,errors,"answerText","answerText không được để trống."); ints(r,errors,"displayOrder"); }
    }

    private List<ParsedRow> readSheet(Workbook workbook, SheetSpec spec, List<ImportError> errors) {
        Sheet sheet=workbook.getSheet(spec.name());
        if(sheet==null){ errors.add(new ImportError(spec.name(),1,"Thiếu sheet bắt buộc " + spec.name() + ".")); return List.of(); }
        Row header=sheet.getRow(0); Map<String,Integer> indexes=new HashMap<>(); DataFormatter formatter=new DataFormatter(Locale.ROOT);
        if(header!=null) for(Cell cell:header) indexes.put(formatter.formatCellValue(cell).trim().toLowerCase(Locale.ROOT),cell.getColumnIndex());
        for(String column:spec.headers()) if(!indexes.containsKey(column.toLowerCase(Locale.ROOT))) errors.add(new ImportError(spec.name(),1,"Thiếu cột " + column + "."));
        List<ParsedRow> result=new ArrayList<>();
        for(int i=1;i<=sheet.getLastRowNum();i++){
            Row source=sheet.getRow(i); if(source==null) continue; Map<String,String> values=new LinkedHashMap<>(); boolean any=false;
            for(String column:spec.headers()){ Integer index=indexes.get(column.toLowerCase(Locale.ROOT)); String value=index==null?"":formatter.formatCellValue(source.getCell(index,Row.MissingCellPolicy.RETURN_BLANK_AS_NULL)).trim(); values.put(column,value); any|=!value.isBlank(); }
            if(any) result.add(new ParsedRow(spec.name(),i+1,values));
        }
        return result;
    }

    private void createDataSheet(Workbook wb, SheetSpec spec, CellStyle header, CellStyle example) {
        Sheet sheet=wb.createSheet(spec.name()); Row h=sheet.createRow(0), e=sheet.createRow(1);
        for(int i=0;i<spec.headers().length;i++){ Cell hc=h.createCell(i); hc.setCellValue(spec.headers()[i]); hc.setCellStyle(header); Cell ec=e.createCell(i); ec.setCellValue(spec.example()[i]); ec.setCellStyle(example); sheet.setColumnWidth(i,Math.min(50,Math.max(14,spec.headers()[i].length()+4))*256); }
        sheet.createFreezePane(0,1); sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0,1,0,spec.headers().length-1));
    }

    private void createGuide(Workbook wb, String type, CellStyle header) {
        Sheet sheet=wb.createSheet("HuongDan"); String[] lines={
                "HƯỚNG DẪN IMPORT ĐỀ " + type.toUpperCase(Locale.ROOT),
                "Mỗi sheet dữ liệu đã có một dòng ví dụ. Hãy sửa hoặc xóa dòng ví dụ trước khi import.",
                "Các cột *Ref là chuỗi tự đặt và phân biệt hoa/thường; Ref con phải khớp chính xác Ref cha trong cùng file.",
                "Để trống cột số thứ tự nếu muốn hệ thống tự tính max trong phạm vi cha + 1.",
                "Cột media có thể chứa URL http(s) đầy đủ HOẶC đúng tên file ảnh/audio sẽ đính kèm khi import; hệ thống sẽ tự upload file được tham chiếu.",
                "status hợp lệ: draft, published, active, ready, hidden. correctOption/optionLabel TOEIC chỉ nhận A-D.",
                "Nếu có lỗi, toàn bộ import sẽ rollback và API trả danh sách sheet/dòng/lỗi để sửa cùng lúc."};
        for(int i=0;i<lines.length;i++){ Row row=sheet.createRow(i); Cell cell=row.createCell(0); cell.setCellValue(lines[i]); if(i==0)cell.setCellStyle(header); }
        sheet.setColumnWidth(0,120*256); sheet.createFreezePane(0,1);
    }

    private CellStyle headerStyle(Workbook wb){ CellStyle s=wb.createCellStyle(); Font f=wb.createFont(); f.setBold(true); f.setColor(IndexedColors.WHITE.getIndex()); s.setFont(f); s.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex()); s.setFillPattern(FillPatternType.SOLID_FOREGROUND); s.setWrapText(true); return s; }
    private CellStyle exampleStyle(Workbook wb){ CellStyle s=wb.createCellStyle(); s.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex()); s.setFillPattern(FillPatternType.SOLID_FOREGROUND); s.setWrapText(true); return s; }
    private Set<String> refs(List<ParsedRow> rows,String col,List<ImportError> errors){ Set<String> result=new HashSet<>(); for(ParsedRow r:rows){ String value=r.get(col); if(value.isBlank()) error(r,errors,col+" không được để trống."); else if(!result.add(value)) error(r,errors,col+" bị trùng: "+value); } return result; }
    private void parent(ParsedRow r,List<ImportError> e,String col,Set<String> refs,String parent){ String value=r.get(col); if(value.isBlank()) error(r,e,col+" không được để trống."); else if(!refs.contains(value)) error(r,e,col+" không tồn tại trong sheet "+parent+": "+value); }
    private void require(ParsedRow r,List<ImportError> e,String col,String msg){ if(r.get(col).isBlank()) error(r,e,msg); }
    private void enumValue(ParsedRow r,List<ImportError> e,String col,Set<String> values){ String value=r.get(col); if(!value.isBlank()&&!values.contains(value.toUpperCase(Locale.ROOT))) error(r,e,col+" không hợp lệ: "+value); }
    private void ints(ParsedRow r,List<ImportError> e,String... cols){ for(String col:cols){ String value=r.get(col); if(value.isBlank())continue; try{ if(Integer.parseInt(value)<=0)throw new NumberFormatException(); }catch(NumberFormatException x){ error(r,e,col+" phải là số nguyên dương hoặc để trống."); } } }
    private void error(ParsedRow r,List<ImportError> e,String msg){ e.add(new ImportError(r.sheet(),r.row(),msg)); }
    private Integer num(ParsedRow r,String col){ String value=r.get(col); return value.isBlank()?null:Integer.valueOf(value); }
    private String type(String raw){ String t=Objects.toString(raw,"").trim().toLowerCase(Locale.ROOT); if(!Set.of("toeic","ielts").contains(t))throw new IllegalArgumentException("Loại đề thi không hợp lệ."); return t; }
    private ExamImportValidationException invalid(String sheet,int row,String message){ return new ExamImportValidationException(List.of(new ImportError(sheet,row,message))); }
    private String safeMessage(Exception e){ return e.getMessage()==null?e.getClass().getSimpleName():e.getMessage(); }
    private static String[] arr(String... values){ return values; }
    private static SheetSpec spec(String name,String[] headers,String[] example){ return new SheetSpec(name,headers,example); }
    private record SheetSpec(String name,String[] headers,String[] example){}
    private record ParsedRow(String sheet,int row,Map<String,String> values){ String get(String key){ return values.getOrDefault(key,""); } }

    private static final class Values {
        String title,instruction,sharedText,text,questionText,promptText,explanation,transcript,imageUrl,audioUrl,correctAnswer,label,type,content,assetUrl,answerText,answerKey,topicTitle,sampleAnswer,skill,optionKey,optionLabel;
        Integer displayOrder,minWords,maxAnswers,parentId,partNo,groupNo,blockNo,taskNo,questionNo;
        ContentCreateRequest request(){ return new ContentCreateRequest(title,instruction,sharedText,text,questionText,promptText,explanation,transcript,imageUrl,audioUrl,correctAnswer,label,type,content,assetUrl,answerText,answerKey,topicTitle,sampleAnswer,displayOrder,minWords,maxAnswers,parentId,skill,partNo,groupNo,blockNo,taskNo,questionNo,optionKey,optionLabel); }
    }
}
