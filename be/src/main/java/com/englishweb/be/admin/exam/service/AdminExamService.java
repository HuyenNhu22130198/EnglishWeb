package com.englishweb.be.admin.exam.service;

import com.englishweb.be.admin.exam.dto.AdminExamDtos.*;
import com.englishweb.be.entity.ielts.*;
import com.englishweb.be.entity.toeic.*;
import com.englishweb.be.repository.ielts.*;
import com.englishweb.be.repository.toeic.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminExamService {
    private static final Set<String> ALLOWED_STATUSES = Set.of("draft", "published", "active", "ready", "hidden");

    private final ToeicExamRepository toeicExams;
    private final ToeicAttemptRepository toeicAttempts;
    private final ToeicQuestionRepository toeicQuestions;
    private final ToeicGroupRepository toeicGroups;
    private final ToeicQuestionOptionRepository toeicOptions;
    private final ToeicGroupMaterialRepository toeicMaterials;
    private final IeltsExamRepository ieltsExams;
    private final IeltsAttemptRepository ieltsAttempts;
    private final IeltsQuestionRepository ieltsQuestions;
    private final IeltsSectionGroupRepository ieltsGroups;
    private final IeltsQuestionBlockRepository ieltsBlocks;
    private final IeltsQuestionOptionRepository ieltsOptions;
    private final IeltsQuestionAnswerRepository ieltsAnswers;
    private final IeltsMediaAssetRepository ieltsMedia;
    private final IeltsWritingTaskRepository writingTasks;
    private final IeltsWritingSampleAnswerRepository writingSamples;
    private final IeltsSpeakingTaskRepository speakingTasks;
    private final IeltsSpeakingItemRepository speakingItems;
    private final IeltsSpeakingSampleAnswerRepository speakingSamples;
    private final JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public PageResponse<ExamSummary> list(String rawType, String keyword, String status, String sort, int page, int size) {
        String type = type(rawType);
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        String q = Objects.toString(keyword, "").trim().toLowerCase(Locale.ROOT);
        String statusFilter = Objects.toString(status, "ALL").trim();
        List<ExamSummary> all = ("toeic".equals(type) ? toeicExams.findAll().stream().map(this::summary) :
                ieltsExams.findAll().stream().map(this::summary)).filter(e ->
                (q.isBlank() || e.examCode().toLowerCase(Locale.ROOT).contains(q) || e.examName().toLowerCase(Locale.ROOT).contains(q)) &&
                (statusFilter.equalsIgnoreCase("ALL") || e.status().equalsIgnoreCase(statusFilter))).toList();
        Comparator<ExamSummary> comparator = Comparator.comparing(ExamSummary::createdAt,
                Comparator.nullsLast(Comparator.naturalOrder()));
        if (!"oldest".equalsIgnoreCase(sort)) comparator = comparator.reversed();
        all = all.stream().sorted(comparator.thenComparing(ExamSummary::id)).toList();
        int from = Math.min(safePage * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        int totalPages = all.isEmpty() ? 0 : (int) Math.ceil((double) all.size() / safeSize);
        return new PageResponse<>(all.subList(from, to), safePage, safeSize, all.size(), totalPages);
    }

    @Transactional(readOnly = true)
    public ExamDetail detail(String rawType, Integer id) {
        return "toeic".equals(type(rawType)) ? toeicDetail(id) : ieltsDetail(id);
    }

    @Transactional
    public ExamDetail updateExam(String rawType, Integer id, ExamUpdateRequest r) {
        String t = type(rawType);
        String code = required(r.examCode(), "Mã đề");
        String name = required(r.examName(), "Tên đề");
        String status = validStatus(r.status());
        if ("toeic".equals(t)) {
            ToeicExam e = toeicExams.findById(id).orElseThrow(() -> notFound("TOEIC"));
            if (toeicExams.existsByExamCodeIgnoreCaseAndIdNot(code, id)) throw new IllegalArgumentException("Mã đề TOEIC đã tồn tại.");
            e.setExamCode(code); e.setExamName(name); e.setStatus(status);
            e.setListeningAudioUrl(required(r.listeningAudioUrl(), "Audio Listening")); e.setUpdatedAt(LocalDateTime.now());
            toeicExams.save(e);
        } else {
            IeltsExam e = ieltsExams.findById(id).orElseThrow(() -> notFound("IELTS"));
            if (ieltsExams.existsByExamCodeIgnoreCaseAndIdNot(code, id)) throw new IllegalArgumentException("Mã đề IELTS đã tồn tại.");
            e.setExamCode(code); e.setExamName(name); e.setStatus(status); e.setUpdatedAt(LocalDateTime.now());
            ieltsExams.save(e);
        }
        return detail(t, id);
    }

    @Transactional
    public ExamSummary updateStatus(String rawType, Integer id, StatusUpdateRequest r) {
        String t = type(rawType); String status = validStatus(r.status());
        if ("toeic".equals(t)) {
            ToeicExam e = toeicExams.findById(id).orElseThrow(() -> notFound("TOEIC"));
            e.setStatus(status); e.setUpdatedAt(LocalDateTime.now()); toeicExams.save(e); return summary(e);
        }
        IeltsExam e = ieltsExams.findById(id).orElseThrow(() -> notFound("IELTS"));
        e.setStatus(status); e.setUpdatedAt(LocalDateTime.now()); ieltsExams.save(e); return summary(e);
    }

    @Transactional
    public ExamDetail updateContent(String rawType, Integer examId, String resource, Integer recordId, ContentUpdateRequest r) {
        String t = type(rawType);
        if ("toeic".equals(t)) updateToeicContent(examId, resource, recordId, r);
        else updateIeltsContent(examId, resource, recordId, r);
        return detail(t, examId);
    }

    @Transactional
    public void delete(String rawType, Integer id) {
        String t = type(rawType);
        if ("toeic".equals(t)) {
            ToeicExam e = toeicExams.findById(id).orElseThrow(() -> notFound("TOEIC"));
            if (toeicAttempts.countByExam_Id(id) > 0) throw new IllegalStateException("Đề đã có lịch sử làm bài nên không thể xóa. Hãy chuyển đề sang trạng thái Ẩn.");
            jdbc.update("delete from toeic_question_option where question_id in (select id from toeic_question where exam_id=?)", id);
            jdbc.update("delete from toeic_group_material where group_id in (select id from toeic_group where exam_id=?)", id);
            jdbc.update("delete from toeic_question where exam_id=?", id);
            jdbc.update("delete from toeic_group where exam_id=?", id);
            toeicExams.delete(e);
        } else {
            IeltsExam e = ieltsExams.findById(id).orElseThrow(() -> notFound("IELTS"));
            if (ieltsAttempts.countByExam_Id(id) > 0) throw new IllegalStateException("Đề đã có lịch sử làm bài nên không thể xóa. Hãy chuyển đề sang trạng thái Ẩn.");
            jdbc.update("delete from ielts_question_answer where question_id in (select question_id from ielts_question where exam_id=?)", id);
            jdbc.update("delete from ielts_question_option where question_id in (select question_id from ielts_question where exam_id=?)", id);
            jdbc.update("delete from ielts_question where exam_id=?", id);
            jdbc.update("delete from ielts_question_block where group_id in (select id from ielts_section_group where exam_id=?)", id);
            jdbc.update("delete from ielts_section_group where exam_id=?", id);
            jdbc.update("delete from ielts_writing_sample_answer where task_id in (select id from ielts_writing_task where exam_id=?)", id);
            jdbc.update("delete from ielts_writing_task where exam_id=?", id);
            jdbc.update("delete from ielts_speaking_sample_answer where speaking_task_id in (select id from ielts_speaking_task where exam_id=?)", id);
            jdbc.update("delete from ielts_speaking_item where speak_id in (select id from ielts_speaking_task where exam_id=?)", id);
            jdbc.update("delete from ielts_speaking_task where exam_id=?", id);
            jdbc.update("delete from ielts_media_asset where exam_id=?", id);
            ieltsExams.delete(e);
        }
        log.info("Admin deleted {} exam id={}; attempt count was zero", t, id);
    }

    private ExamDetail toeicDetail(Integer id) {
        ToeicExam e = toeicExams.findById(id).orElseThrow(() -> notFound("TOEIC"));
        List<GroupDetail> groups = toeicGroups.findByExam_IdOrderByPartNoAscGroupNoAscIdAsc(id).stream().map(g -> {
            List<QuestionDetail> qs = toeicQuestions.findByGroup_IdOrderByQuestionNoAsc(g.getId()).stream().map(q ->
                    new QuestionDetail(q.getId(), q.getQuestionNo(), q.getQuestionText(), q.getCorrectOption(), q.getExplanation(),
                            q.getTranscriptText(), q.getImageUrl(), q.getDisplayOrder(),
                            toeicOptions.findByQuestion_IdOrderByDisplayOrderAsc(q.getId()).stream().map(o ->
                                    new OptionDetail(o.getOptionId(), o.getOptionLabel(), o.getOptionText(), o.getDisplayOrder())).toList(), List.of())).toList();
            List<MaterialDetail> media = toeicMaterials.findByGroup_IdOrderByDisplayOrderAsc(g.getId()).stream().map(m ->
                    new MaterialDetail(m.getId(), m.getMaterialType(), m.getContent(), m.getAssetUrl(), m.getDisplayOrder())).toList();
            return new GroupDetail(g.getId(), g.getSection(), g.getPartNo(), g.getGroupNo(), g.getGroupType(), g.getTitle(),
                    g.getInstructionText(), g.getSharedText(), null, media, List.of(), qs);
        }).toList();
        return new ExamDetail(summary(e), e.getListeningAudioUrl(), groups, List.of(), List.of(), List.of());
    }

    private ExamDetail ieltsDetail(Integer id) {
        IeltsExam e = ieltsExams.findById(id).orElseThrow(() -> notFound("IELTS"));
        List<GroupDetail> groups = new ArrayList<>();
        for (String skill : List.of("LISTENING", "READING")) {
            for (IeltsSectionGroup g : ieltsGroups.findByExam_IdAndSkillIgnoreCaseOrderByPartNoAscGroupNoAscDisplayOrderAscIdAsc(id, skill)) {
                List<BlockDetail> blocks = ieltsBlocks.findByGroup_IdOrderByDisplayOrderAscBlockNoAscIdAsc(g.getId()).stream().map(b -> {
                    List<QuestionDetail> qs = ieltsQuestions.findByBlock_IdOrderByDisplayOrderAscQuestionNoAscQuestionIdAsc(b.getId()).stream().map(q -> {
                        List<OptionDetail> opts = ieltsOptions.findByQuestion_QuestionIdOrderByDisplayOrderAscIdAsc(q.getQuestionId()).stream().map(o -> new OptionDetail(o.getId(), o.getOptionKey(), o.getOptionText(), o.getDisplayOrder())).toList();
                        List<OptionDetail> ans = ieltsAnswers.findByQuestion_QuestionIdOrderByIdAsc(q.getQuestionId()).stream().map(a -> new OptionDetail(a.getId(), a.getAnswerKey(), a.getAnswerText(), null)).toList();
                        return new QuestionDetail(q.getQuestionId(), q.getQuestionNo(), q.getPromptText(), null, q.getExplanationText(), null, null, q.getDisplayOrder(), opts, ans);
                    }).toList();
                    return new BlockDetail(b.getId(), b.getBlockNo(), b.getQuestionType(), b.getInstructionText(), b.getMaxAnswers(), b.getAnswerFormat(), b.getDisplayOrder(), qs);
                }).toList();
                groups.add(new GroupDetail(g.getId(), g.getSkill(), g.getPartNo(), g.getGroupNo(), null, g.getTitle(), g.getInstructionText(), g.getSharedText(), g.getDisplayOrder(), List.of(), blocks, List.of()));
            }
        }
        List<WritingTaskDetail> writing = writingTasks.findByExam_IdOrderByTaskNoAscDisplayOrderAscIdAsc(id).stream().map(t ->
                new WritingTaskDetail(t.getId(), t.getTaskNo(), t.getTaskType(), t.getInstructionText(), t.getPromptText(), t.getMinWords(), t.getDisplayOrder(),
                        writingSamples.findByTask_IdOrderByDisplayOrderAscIdAsc(t.getId()).stream().map(s -> new OptionDetail(s.getId(), "Bài mẫu", s.getAnswerText(), s.getDisplayOrder())).toList())).toList();
        List<SpeakingTaskDetail> speaking = speakingTasks.findByExam_IdOrderByPartNoAscDisplayOrderAscIdAsc(id).stream().map(t ->
                new SpeakingTaskDetail(t.getId(), t.getPartNo(), t.getTopicTitle(), t.getInstructionText(), t.getDisplayOrder(),
                        speakingItems.findBySpeakingTask_IdOrderByDisplayOrderAscIdAsc(t.getId()).stream().map(i -> new OptionDetail(i.getId(), "Câu hỏi", i.getContentText(), i.getDisplayOrder())).toList(),
                        speakingSamples.findBySpeakingTask_IdOrderByDisplayOrderAscIdAsc(t.getId()).stream().map(s -> new OptionDetail(s.getId(), s.getSegmentTitle(), s.getAnswerText(), s.getDisplayOrder())).toList())).toList();
        List<MaterialDetail> media = ieltsMedia.findByExam_IdOrderBySkillAscPartNoAscDisplayOrderAscIdAsc(id).stream().map(m -> new MaterialDetail(m.getId(), m.getAssetType(), m.getSkill(), m.getAssetUrl(), m.getDisplayOrder())).toList();
        return new ExamDetail(summary(e), null, groups, writing, speaking, media);
    }

    private void updateToeicContent(Integer examId, String resource, Integer id, ContentUpdateRequest r) {
        toeicExams.findById(examId).orElseThrow(() -> notFound("TOEIC"));
        switch (resource) {
            case "questions" -> { ToeicQuestion q = toeicQuestions.findById(id).filter(x -> x.getExam().getId().equals(examId)).orElseThrow(() -> wrongExam()); if (r.questionText() != null) q.setQuestionText(r.questionText()); if (r.correctAnswer() != null) q.setCorrectOption(toeicAnswer(r.correctAnswer())); if (r.explanation() != null) q.setExplanation(r.explanation()); if (r.transcript() != null) q.setTranscriptText(r.transcript()); if (r.imageUrl() != null) q.setImageUrl(r.imageUrl()); q.setUpdatedAt(LocalDateTime.now()); toeicQuestions.save(q); }
            case "options" -> { ToeicQuestionOption o = toeicOptions.findById(id).filter(x -> x.getQuestion().getExam().getId().equals(examId)).orElseThrow(() -> wrongExam()); o.setOptionText(required(r.text(), "Nội dung lựa chọn")); toeicOptions.save(o); }
            case "groups" -> { ToeicGroup g = toeicGroups.findById(id).filter(x -> x.getExam().getId().equals(examId)).orElseThrow(() -> wrongExam()); if (r.title() != null) g.setTitle(r.title()); if (r.instruction() != null) g.setInstructionText(r.instruction()); if (r.sharedText() != null) g.setSharedText(r.sharedText()); g.setUpdatedAt(LocalDateTime.now()); toeicGroups.save(g); }
            case "materials" -> { ToeicGroupMaterial m = toeicMaterials.findById(id).filter(x -> x.getGroup().getExam().getId().equals(examId)).orElseThrow(() -> wrongExam()); if (r.content() != null) m.setContent(r.content()); if (r.assetUrl() != null) m.setAssetUrl(r.assetUrl()); toeicMaterials.save(m); }
            default -> throw new IllegalArgumentException("Loại nội dung TOEIC không hợp lệ.");
        }
    }

    private void updateIeltsContent(Integer examId, String resource, Integer id, ContentUpdateRequest r) {
        ieltsExams.findById(examId).orElseThrow(() -> notFound("IELTS"));
        switch (resource) {
            case "questions" -> { IeltsQuestion q = ieltsQuestions.findById(id).filter(x -> x.getExam().getId().equals(examId)).orElseThrow(() -> wrongExam()); if (r.promptText() != null) q.setPromptText(r.promptText()); if (r.explanation() != null) q.setExplanationText(r.explanation()); q.setUpdatedAt(LocalDateTime.now()); ieltsQuestions.save(q); }
            case "options" -> { IeltsQuestionOption o = ieltsOptions.findById(id).filter(x -> examId.equals(x.getQuestion().getExam().getId())).orElseThrow(() -> wrongExam()); o.setOptionText(required(r.text(), "Nội dung lựa chọn")); ieltsOptions.save(o); }
            case "answers" -> { IeltsQuestionAnswer a = ieltsAnswers.findById(id).filter(x -> examId.equals(x.getQuestion().getExam().getId())).orElseThrow(() -> wrongExam()); if (r.answerKey() != null) a.setAnswerKey(r.answerKey()); if (r.answerText() != null) a.setAnswerText(r.answerText()); ieltsAnswers.save(a); }
            case "groups" -> { IeltsSectionGroup g = ieltsGroups.findById(id).filter(x -> examId.equals(x.getExam().getId())).orElseThrow(() -> wrongExam()); if (r.title() != null) g.setTitle(r.title()); if (r.instruction() != null) g.setInstructionText(r.instruction()); if (r.sharedText() != null) g.setSharedText(r.sharedText()); g.setUpdatedAt(LocalDateTime.now()); ieltsGroups.save(g); }
            case "blocks" -> { IeltsQuestionBlock b = ieltsBlocks.findById(id).filter(x -> examId.equals(x.getGroup().getExam().getId())).orElseThrow(() -> wrongExam()); if (r.instruction() != null) b.setInstructionText(r.instruction()); if (r.maxAnswers() != null) b.setMaxAnswers(r.maxAnswers()); ieltsBlocks.save(b); }
            case "media" -> { IeltsMediaAsset m = ieltsMedia.findById(id).filter(x -> examId.equals(x.getExam().getId())).orElseThrow(() -> wrongExam()); m.setAssetUrl(r.assetUrl()); ieltsMedia.save(m); }
            case "writing-tasks" -> { IeltsWritingTask t = writingTasks.findById(id).filter(x -> examId.equals(x.getExam().getId())).orElseThrow(() -> wrongExam()); if (r.instruction() != null) t.setInstructionText(required(r.instruction(), "Hướng dẫn")); if (r.promptText() != null) t.setPromptText(required(r.promptText(), "Đề bài")); if (r.minWords() != null) t.setMinWords(r.minWords()); writingTasks.save(t); }
            case "writing-samples" -> { IeltsWritingSampleAnswer s = writingSamples.findById(id).filter(x -> examId.equals(x.getTask().getExam().getId())).orElseThrow(() -> wrongExam()); s.setAnswerText(required(r.answerText(), "Bài mẫu")); writingSamples.save(s); }
            case "speaking-tasks" -> { IeltsSpeakingTask t = speakingTasks.findById(id).filter(x -> examId.equals(x.getExam().getId())).orElseThrow(() -> wrongExam()); if (r.topicTitle() != null) t.setTopicTitle(r.topicTitle()); if (r.instruction() != null) t.setInstructionText(r.instruction()); t.setUpdatedAt(LocalDateTime.now()); speakingTasks.save(t); }
            case "speaking-items" -> { IeltsSpeakingItem i = speakingItems.findById(id).filter(x -> examId.equals(x.getSpeakingTask().getExam().getId())).orElseThrow(() -> wrongExam()); i.setContentText(required(r.text(), "Câu hỏi")); speakingItems.save(i); }
            case "speaking-samples" -> { IeltsSpeakingSampleAnswer s = speakingSamples.findById(id).filter(x -> examId.equals(x.getSpeakingTask().getExam().getId())).orElseThrow(() -> wrongExam()); s.setAnswerText(required(r.answerText(), "Bài mẫu")); s.setUpdatedAt(LocalDateTime.now()); speakingSamples.save(s); }
            default -> throw new IllegalArgumentException("Loại nội dung IELTS không hợp lệ.");
        }
    }

    private ExamSummary summary(ToeicExam e) { return new ExamSummary(e.getId(), e.getExamCode(), e.getExamName(), "TOEIC", e.getStatus(), toeicQuestions.countByExam_Id(e.getId()), toeicAttempts.countByExam_Id(e.getId()), e.getCreatedAt(), e.getUpdatedAt()); }
    private ExamSummary summary(IeltsExam e) { return new ExamSummary(e.getId(), e.getExamCode(), e.getExamName(), "IELTS", e.getStatus(), ieltsQuestions.countByExam_Id(e.getId()), ieltsAttempts.countByExam_Id(e.getId()), e.getCreatedAt(), e.getUpdatedAt()); }
    private String type(String raw) { String t = Objects.toString(raw, "").toLowerCase(Locale.ROOT); if (!t.equals("toeic") && !t.equals("ielts")) throw new IllegalArgumentException("Loại đề thi không hợp lệ."); return t; }
    private String validStatus(String raw) { String s = required(raw, "Trạng thái").toLowerCase(Locale.ROOT); if (!ALLOWED_STATUSES.contains(s)) throw new IllegalArgumentException("Trạng thái đề thi không hợp lệ."); return s; }
    private String toeicAnswer(String raw) { String value = required(raw, "Đáp án đúng").toUpperCase(Locale.ROOT); if (!value.matches("[A-D]")) throw new IllegalArgumentException("Đáp án TOEIC phải là A, B, C hoặc D."); return value; }
    private String required(String value, String label) { if (value == null || value.trim().isEmpty()) throw new IllegalArgumentException(label + " không được để trống."); return value.trim(); }
    private RuntimeException notFound(String type) { return new NoSuchElementException("Không tìm thấy đề " + type + "."); }
    private RuntimeException wrongExam() { return new IllegalArgumentException("Record không tồn tại hoặc không thuộc đề thi đã chọn."); }
}
