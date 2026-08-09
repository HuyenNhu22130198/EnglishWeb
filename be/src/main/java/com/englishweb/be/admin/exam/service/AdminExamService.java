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
import org.springframework.transaction.annotation.Propagation;

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
    public ExamDetail create(String rawType, ExamCreateRequest r) {
        String t = type(rawType);
        return detail(t, createExam(t, r));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Integer createForImport(String rawType, ExamCreateRequest r) {
        String t = type(rawType);
        return createExam(t, r);
    }

    @Transactional(readOnly = true)
    public boolean examCodeExists(String rawType, String examCode) {
        String t = type(rawType);
        String code = required(examCode, "Mã đề");
        return "toeic".equals(t) ? toeicExams.existsByExamCodeIgnoreCaseAndIdNot(code, -1)
                : ieltsExams.existsByExamCodeIgnoreCaseAndIdNot(code, -1);
    }

    private Integer createExam(String t, ExamCreateRequest r) {
        String code = required(r.examCode(), "Mã đề");
        String name = required(r.examName(), "Tên đề");
        String status = validStatus(r.status());
        Integer id;
        if ("toeic".equals(t)) {
            if (toeicExams.existsByExamCodeIgnoreCaseAndIdNot(code, -1)) {
                throw new IllegalArgumentException("Mã đề TOEIC đã tồn tại.");
            }
            ToeicExam exam = toeicExams.save(ToeicExam.builder()
                    .examCode(code).examName(name).status(status)
                    .listeningAudioUrl(required(r.listeningAudioUrl(), "Audio Listening")).build());
            id = exam.getId();
        } else {
            if (ieltsExams.existsByExamCodeIgnoreCaseAndIdNot(code, -1)) {
                throw new IllegalArgumentException("Mã đề IELTS đã tồn tại.");
            }
            id = ieltsExams.save(IeltsExam.builder().examCode(code).examName(name).status(status).build()).getId();
        }
        return id;
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
    public ExamDetail addContent(String rawType, Integer examId, String resource, ContentCreateRequest r) {
        String t = type(rawType);
        if ("toeic".equals(t)) addToeicContent(examId, resource, r);
        else addIeltsContent(examId, resource, r);
        return detail(t, examId);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Integer addContentForImport(String rawType, Integer examId, String resource, ContentCreateRequest r) {
        String t = type(rawType);
        return "toeic".equals(t) ? addToeicContent(examId, resource, r) : addIeltsContent(examId, resource, r);
    }

    @Transactional
    public ExamDetail deleteContent(String rawType, Integer examId, String resource, Integer recordId) {
        String t = type(rawType);
        if ("toeic".equals(t)) deleteToeicContent(examId, resource, recordId);
        else deleteIeltsContent(examId, resource, recordId);
        return detail(t, examId);
    }

    private Integer addToeicContent(Integer examId, String resource, ContentCreateRequest r) {
        ToeicExam exam = toeicExams.findById(examId).orElseThrow(() -> notFound("TOEIC"));
        Integer[] createdId = new Integer[1];
        switch (resource) {
            case "groups" -> {
                String section = required(r.skill(), "Kỹ năng").toUpperCase(Locale.ROOT);
                List<ToeicGroup> existing = toeicGroups.findByExam_IdOrderByPartNoAscGroupNoAscIdAsc(examId);
                int partNo = valueOrNext(r.partNo(), existing.stream().map(ToeicGroup::getPartNo).toList());
                int groupNo = valueOrNext(r.groupNo(), existing.stream()
                        .filter(g -> Objects.equals(g.getPartNo(), partNo) && section.equalsIgnoreCase(g.getSection()))
                        .map(ToeicGroup::getGroupNo).toList());
                createdId[0] = toeicGroups.save(ToeicGroup.builder().exam(exam).section(section).partNo(partNo).groupNo(groupNo)
                        .groupType(required(r.type(), "Loại nhóm")).title(r.title())
                        .instructionText(r.instruction()).sharedText(r.sharedText()).build()).getId();
            }
            case "questions" -> {
                ToeicGroup group = toeicGroup(examId, r.parentId());
                List<ToeicQuestion> inExam = toeicQuestions.findByExam_IdOrderByQuestionNoAsc(examId);
                List<ToeicQuestion> inGroup = toeicQuestions.findByGroup_IdOrderByQuestionNoAsc(group.getId());
                createdId[0] = toeicQuestions.save(ToeicQuestion.builder().exam(exam).group(group)
                        .questionNo(valueOrNext(r.questionNo(), inExam.stream().map(ToeicQuestion::getQuestionNo).toList()))
                        .questionText(firstNonNull(r.questionText(), r.text())).imageUrl(r.imageUrl())
                        .correctOption(toeicAnswer(r.correctAnswer())).explanation(r.explanation())
                        .transcriptText(r.transcript())
                        .displayOrder(valueOrNext(r.displayOrder(), inGroup.stream().map(ToeicQuestion::getDisplayOrder).toList()))
                        .build()).getId();
            }
            case "options" -> {
                ToeicQuestion question = toeicQuestion(examId, r.parentId());
                List<ToeicQuestionOption> existing = toeicOptions.findByQuestion_IdOrderByDisplayOrderAsc(question.getId());
                int order = valueOrNext(r.displayOrder(), existing.stream().map(ToeicQuestionOption::getDisplayOrder).toList());
                String label = normalize(firstNonNull(r.optionLabel(), r.label()));
                if (label.isBlank()) label = String.valueOf((char) ('A' + order - 1));
                label = label.toUpperCase(Locale.ROOT);
                if (!label.matches("[A-D]")) throw new IllegalArgumentException("Nhãn lựa chọn TOEIC phải là A, B, C hoặc D.");
                createdId[0] = toeicOptions.save(ToeicQuestionOption.builder().question(question).optionLabel(label)
                        .optionText(required(r.text(), "Nội dung lựa chọn")).displayOrder(order).build()).getOptionId();
            }
            case "materials" -> {
                ToeicGroup group = toeicGroup(examId, r.parentId());
                List<ToeicGroupMaterial> existing = toeicMaterials.findByGroup_IdOrderByDisplayOrderAsc(group.getId());
                createdId[0] = toeicMaterials.save(ToeicGroupMaterial.builder().group(group)
                        .materialType(required(r.type(), "Loại media")).content(r.content()).assetUrl(r.assetUrl())
                        .displayOrder(valueOrNext(r.displayOrder(), existing.stream().map(ToeicGroupMaterial::getDisplayOrder).toList()))
                        .build()).getId();
            }
            default -> throw new IllegalArgumentException("Loại nội dung TOEIC không hợp lệ.");
        }
        return createdId[0];
    }

    private Integer addIeltsContent(Integer examId, String resource, ContentCreateRequest r) {
        IeltsExam exam = ieltsExams.findById(examId).orElseThrow(() -> notFound("IELTS"));
        Integer[] createdId = new Integer[1];
        switch (resource) {
            case "groups" -> {
                String skill = required(r.skill(), "Kỹ năng").toUpperCase(Locale.ROOT);
                if (!Set.of("LISTENING", "READING").contains(skill)) {
                    throw new IllegalArgumentException("Group IELTS chỉ hỗ trợ LISTENING hoặc READING.");
                }
                List<IeltsSectionGroup> existing = ieltsGroups
                        .findByExam_IdAndSkillIgnoreCaseOrderByPartNoAscGroupNoAscDisplayOrderAscIdAsc(examId, skill);
                int partNo = valueOrNext(r.partNo(), existing.stream().map(IeltsSectionGroup::getPartNo).toList());
                int groupNo = valueOrNext(r.groupNo(), existing.stream().filter(g -> Objects.equals(g.getPartNo(), partNo))
                        .map(IeltsSectionGroup::getGroupNo).toList());
                createdId[0] = ieltsGroups.save(IeltsSectionGroup.builder().exam(exam).skill(skill).partNo(partNo).groupNo(groupNo)
                        .title(r.title()).instructionText(r.instruction()).sharedText(r.sharedText())
                        .displayOrder(valueOrNext(r.displayOrder(), existing.stream().map(IeltsSectionGroup::getDisplayOrder).toList()))
                        .build()).getId();
            }
            case "blocks" -> {
                IeltsSectionGroup group = ieltsGroup(examId, r.parentId());
                List<IeltsQuestionBlock> existing = ieltsBlocks.findByGroup_IdOrderByDisplayOrderAscBlockNoAscIdAsc(group.getId());
                createdId[0] = ieltsBlocks.save(IeltsQuestionBlock.builder().group(group)
                        .blockNo(valueOrNext(r.blockNo(), existing.stream().map(IeltsQuestionBlock::getBlockNo).toList()))
                        .questionType(required(r.type(), "Loại câu hỏi")).instructionText(r.instruction())
                        .maxAnswers(r.maxAnswers()).answerFormat(r.label())
                        .displayOrder(valueOrNext(r.displayOrder(), existing.stream().map(IeltsQuestionBlock::getDisplayOrder).toList()))
                        .build()).getId();
            }
            case "questions" -> {
                IeltsQuestionBlock block = ieltsBlock(examId, r.parentId());
                List<IeltsQuestion> inBlock = ieltsQuestions.findByBlock_IdOrderByDisplayOrderAscQuestionNoAscQuestionIdAsc(block.getId());
                List<IeltsQuestion> inSkill = ieltsQuestions.findByExamIdAndSkill(examId, block.getGroup().getSkill());
                Integer nextId = jdbc.queryForObject("select coalesce(max(question_id), 0) + 1 from ielts_question", Integer.class);
                createdId[0] = ieltsQuestions.saveAndFlush(IeltsQuestion.builder().questionId(nextId).exam(exam).block(block)
                        .questionNo(valueOrNext(r.questionNo(), inSkill.stream().map(IeltsQuestion::getQuestionNo).toList()))
                        .promptText(firstNonNull(r.promptText(), r.questionText(), r.text())).explanationText(r.explanation())
                        .displayOrder(valueOrNext(r.displayOrder(), inBlock.stream().map(IeltsQuestion::getDisplayOrder).toList()))
                        .build()).getQuestionId();
            }
            case "options" -> {
                IeltsQuestion question = ieltsQuestion(examId, r.parentId());
                List<IeltsQuestionOption> existing = ieltsOptions.findByQuestion_QuestionIdOrderByDisplayOrderAscIdAsc(question.getQuestionId());
                int order = valueOrNext(r.displayOrder(), existing.stream().map(IeltsQuestionOption::getDisplayOrder).toList());
                String key = normalize(firstNonNull(r.optionKey(), r.label()));
                if (key.isBlank()) key = String.valueOf((char) ('A' + order - 1));
                createdId[0] = ieltsOptions.save(IeltsQuestionOption.builder().question(question).optionKey(key)
                        .optionText(required(r.text(), "Nội dung lựa chọn")).displayOrder(order).build()).getId();
            }
            case "answers" -> {
                IeltsQuestion question = ieltsQuestion(examId, r.parentId());
                createdId[0] = ieltsAnswers.save(IeltsQuestionAnswer.builder().question(question).answerKey(r.answerKey())
                        .answerText(required(firstNonNull(r.answerText(), r.text()), "Đáp án")).build()).getId();
            }
            case "media" -> {
                if (r.parentId() != null) ieltsGroup(examId, r.parentId());
                List<IeltsMediaAsset> existing = ieltsMedia.findByExam_IdOrderBySkillAscPartNoAscDisplayOrderAscIdAsc(examId);
                createdId[0] = ieltsMedia.save(IeltsMediaAsset.builder().exam(exam).skill(r.skill()).partNo(r.partNo())
                        .assetType(required(r.type(), "Loại media")).assetUrl(required(r.assetUrl(), "URL media"))
                        .displayOrder(valueOrNext(r.displayOrder(), existing.stream().map(IeltsMediaAsset::getDisplayOrder).toList()))
                        .build()).getId();
            }
            case "writing-tasks" -> {
                List<IeltsWritingTask> existing = writingTasks.findByExam_IdOrderByTaskNoAscDisplayOrderAscIdAsc(examId);
                createdId[0] = writingTasks.save(IeltsWritingTask.builder().exam(exam)
                        .taskNo(valueOrNext(r.taskNo(), existing.stream().map(IeltsWritingTask::getTaskNo).toList()))
                        .taskType(required(r.type(), "Loại Writing task"))
                        .instructionText(required(r.instruction(), "Hướng dẫn"))
                        .promptText(required(r.promptText(), "Đề bài")).minWords(r.minWords() == null ? 150 : r.minWords())
                        .displayOrder(valueOrNext(r.displayOrder(), existing.stream().map(IeltsWritingTask::getDisplayOrder).toList()))
                        .build()).getId();
            }
            case "writing-samples" -> {
                IeltsWritingTask task = writingTask(examId, r.parentId());
                List<IeltsWritingSampleAnswer> existing = writingSamples.findByTask_IdOrderByDisplayOrderAscIdAsc(task.getId());
                createdId[0] = writingSamples.save(IeltsWritingSampleAnswer.builder().task(task)
                        .answerText(required(firstNonNull(r.answerText(), r.sampleAnswer(), r.text()), "Bài mẫu"))
                        .sourceType("TEACHER")
                        .displayOrder(valueOrNext(r.displayOrder(), existing.stream().map(IeltsWritingSampleAnswer::getDisplayOrder).toList()))
                        .build()).getId();
            }
            case "speaking-tasks" -> {
                List<IeltsSpeakingTask> existing = speakingTasks.findByExam_IdOrderByPartNoAscDisplayOrderAscIdAsc(examId);
                LocalDateTime now = LocalDateTime.now();
                createdId[0] = speakingTasks.save(IeltsSpeakingTask.builder().exam(exam)
                        .partNo(valueOrNext(r.partNo(), existing.stream().map(IeltsSpeakingTask::getPartNo).toList()))
                        .topicTitle(r.topicTitle()).instructionText(r.instruction())
                        .displayOrder(valueOrNext(r.displayOrder(), existing.stream().map(IeltsSpeakingTask::getDisplayOrder).toList()))
                        .createdAt(now).updatedAt(now).build()).getId();
            }
            case "speaking-items" -> {
                IeltsSpeakingTask task = speakingTask(examId, r.parentId());
                List<IeltsSpeakingItem> existing = speakingItems.findBySpeakingTask_IdOrderByDisplayOrderAscIdAsc(task.getId());
                createdId[0] = speakingItems.save(IeltsSpeakingItem.builder().speakingTask(task)
                        .contentText(required(r.text(), "Câu hỏi"))
                        .displayOrder(valueOrNext(r.displayOrder(), existing.stream().map(IeltsSpeakingItem::getDisplayOrder).toList()))
                        .build()).getId();
            }
            case "speaking-samples" -> {
                IeltsSpeakingTask task = speakingTask(examId, r.parentId());
                List<IeltsSpeakingSampleAnswer> existing = speakingSamples.findBySpeakingTask_IdOrderByDisplayOrderAscIdAsc(task.getId());
                int order = valueOrNext(r.displayOrder(), existing.stream().map(IeltsSpeakingSampleAnswer::getDisplayOrder).toList());
                LocalDateTime now = LocalDateTime.now();
                createdId[0] = speakingSamples.save(IeltsSpeakingSampleAnswer.builder().speakingTask(task).segmentNo(order)
                        .segmentTitle(firstNonNull(r.title(), r.label()))
                        .answerText(required(firstNonNull(r.answerText(), r.sampleAnswer(), r.text()), "Bài mẫu"))
                        .sourceType("TEACHER").voiceLocale("en-US").displayOrder(order)
                        .createdAt(now).updatedAt(now).build()).getId();
            }
            default -> throw new IllegalArgumentException("Loại nội dung IELTS không hợp lệ.");
        }
        return createdId[0];
    }

    private void deleteToeicContent(Integer examId, String resource, Integer id) {
        toeicExams.findById(examId).orElseThrow(() -> notFound("TOEIC"));
        switch (resource) {
            case "groups" -> {
                ToeicGroup group = toeicGroup(examId, id);
                jdbc.update("delete from toeic_question_option where question_id in (select id from toeic_question where group_id=?)", id);
                jdbc.update("delete from toeic_group_material where group_id=?", id);
                jdbc.update("delete from toeic_question where group_id=?", id);
                toeicGroups.delete(group);
            }
            case "questions" -> {
                ToeicQuestion question = toeicQuestion(examId, id);
                jdbc.update("delete from toeic_question_option where question_id=?", id);
                toeicQuestions.delete(question);
            }
            case "options" -> toeicOptions.delete(toeicOptions.findById(id)
                    .filter(o -> examId.equals(o.getQuestion().getExam().getId())).orElseThrow(this::wrongExam));
            case "materials" -> toeicMaterials.delete(toeicMaterials.findById(id)
                    .filter(m -> examId.equals(m.getGroup().getExam().getId())).orElseThrow(this::wrongExam));
            default -> throw new IllegalArgumentException("Loại nội dung TOEIC không hợp lệ.");
        }
    }

    private void deleteIeltsContent(Integer examId, String resource, Integer id) {
        ieltsExams.findById(examId).orElseThrow(() -> notFound("IELTS"));
        switch (resource) {
            case "groups" -> {
                IeltsSectionGroup group = ieltsGroup(examId, id);
                jdbc.update("delete from ielts_question_answer where question_id in (select question_id from ielts_question where block_id in (select id from ielts_question_block where group_id=?))", id);
                jdbc.update("delete from ielts_question_option where question_id in (select question_id from ielts_question where block_id in (select id from ielts_question_block where group_id=?))", id);
                jdbc.update("delete from ielts_question where block_id in (select id from ielts_question_block where group_id=?)", id);
                jdbc.update("delete from ielts_question_block where group_id=?", id);
                ieltsGroups.delete(group);
            }
            case "blocks" -> {
                IeltsQuestionBlock block = ieltsBlock(examId, id);
                jdbc.update("delete from ielts_question_answer where question_id in (select question_id from ielts_question where block_id=?)", id);
                jdbc.update("delete from ielts_question_option where question_id in (select question_id from ielts_question where block_id=?)", id);
                jdbc.update("delete from ielts_question where block_id=?", id);
                ieltsBlocks.delete(block);
            }
            case "questions" -> {
                IeltsQuestion question = ieltsQuestion(examId, id);
                jdbc.update("delete from ielts_question_answer where question_id=?", id);
                jdbc.update("delete from ielts_question_option where question_id=?", id);
                ieltsQuestions.delete(question);
            }
            case "options" -> ieltsOptions.delete(ieltsOptions.findById(id)
                    .filter(o -> examId.equals(o.getQuestion().getExam().getId())).orElseThrow(this::wrongExam));
            case "answers" -> ieltsAnswers.delete(ieltsAnswers.findById(id)
                    .filter(a -> examId.equals(a.getQuestion().getExam().getId())).orElseThrow(this::wrongExam));
            case "media" -> {
                IeltsMediaAsset media = ieltsMedia.findById(id).filter(m -> examId.equals(m.getExam().getId()))
                        .orElseThrow(this::wrongExam);
                jdbc.update("update ielts_section_group set main_asset_id=null where main_asset_id=?", id);
                ieltsMedia.delete(media);
            }
            case "writing-tasks" -> {
                IeltsWritingTask task = writingTask(examId, id);
                jdbc.update("delete from ielts_writing_sample_answer where task_id=?", id);
                writingTasks.delete(task);
            }
            case "writing-samples" -> writingSamples.delete(writingSamples.findById(id)
                    .filter(s -> examId.equals(s.getTask().getExam().getId())).orElseThrow(this::wrongExam));
            case "speaking-tasks" -> {
                IeltsSpeakingTask task = speakingTask(examId, id);
                jdbc.update("delete from ielts_speaking_sample_answer where speaking_task_id=?", id);
                jdbc.update("delete from ielts_speaking_item where speak_id=?", id);
                speakingTasks.delete(task);
            }
            case "speaking-items" -> {
                IeltsSpeakingItem item = speakingItems.findById(id)
                        .filter(i -> examId.equals(i.getSpeakingTask().getExam().getId())).orElseThrow(this::wrongExam);
                jdbc.update("delete from ielts_speaking_sample_answer where speaking_item_id=?", id);
                speakingItems.delete(item);
            }
            case "speaking-samples" -> speakingSamples.delete(speakingSamples.findById(id)
                    .filter(s -> examId.equals(s.getSpeakingTask().getExam().getId())).orElseThrow(this::wrongExam));
            default -> throw new IllegalArgumentException("Loại nội dung IELTS không hợp lệ.");
        }
    }

    @Transactional
    public void delete(String rawType, Integer id) {
        String t = type(rawType);
        if ("toeic".equals(t)) {
            ToeicExam e = toeicExams.findById(id).orElseThrow(() -> notFound("TOEIC"));
            if (toeicAttempts.countByExam_Id(id) > 0) throw new IllegalStateException("Đề đã có lịch sử làm bài nên không thể xóa. Hãy chuyển đề sang trạng thái Ẩn.");
            for (ToeicGroup group : toeicGroups.findByExam_IdOrderByPartNoAscGroupNoAscIdAsc(id)) {
                deleteToeicContent(id, "groups", group.getId());
            }
            toeicExams.delete(e);
        } else {
            IeltsExam e = ieltsExams.findById(id).orElseThrow(() -> notFound("IELTS"));
            if (ieltsAttempts.countByExam_Id(id) > 0) throw new IllegalStateException("Đề đã có lịch sử làm bài nên không thể xóa. Hãy chuyển đề sang trạng thái Ẩn.");
            for (Integer groupId : jdbc.queryForList("select id from ielts_section_group where exam_id=?", Integer.class, id)) {
                deleteIeltsContent(id, "groups", groupId);
            }
            for (IeltsWritingTask task : writingTasks.findByExam_IdOrderByTaskNoAscDisplayOrderAscIdAsc(id)) {
                deleteIeltsContent(id, "writing-tasks", task.getId());
            }
            for (IeltsSpeakingTask task : speakingTasks.findByExam_IdOrderByPartNoAscDisplayOrderAscIdAsc(id)) {
                deleteIeltsContent(id, "speaking-tasks", task.getId());
            }
            for (IeltsMediaAsset media : ieltsMedia.findByExam_IdOrderBySkillAscPartNoAscDisplayOrderAscIdAsc(id)) {
                deleteIeltsContent(id, "media", media.getId());
            }
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

    private ToeicGroup toeicGroup(Integer examId, Integer id) {
        if (id == null) throw wrongExam();
        return toeicGroups.findById(id).filter(g -> examId.equals(g.getExam().getId())).orElseThrow(this::wrongExam);
    }

    private ToeicQuestion toeicQuestion(Integer examId, Integer id) {
        if (id == null) throw wrongExam();
        return toeicQuestions.findById(id).filter(q -> examId.equals(q.getExam().getId())).orElseThrow(this::wrongExam);
    }

    private IeltsSectionGroup ieltsGroup(Integer examId, Integer id) {
        if (id == null) throw wrongExam();
        return ieltsGroups.findById(id).filter(g -> examId.equals(g.getExam().getId())).orElseThrow(this::wrongExam);
    }

    private IeltsQuestionBlock ieltsBlock(Integer examId, Integer id) {
        if (id == null) throw wrongExam();
        return ieltsBlocks.findById(id).filter(b -> examId.equals(b.getGroup().getExam().getId())).orElseThrow(this::wrongExam);
    }

    private IeltsQuestion ieltsQuestion(Integer examId, Integer id) {
        if (id == null) throw wrongExam();
        return ieltsQuestions.findById(id).filter(q -> examId.equals(q.getExam().getId())).orElseThrow(this::wrongExam);
    }

    private IeltsWritingTask writingTask(Integer examId, Integer id) {
        if (id == null) throw wrongExam();
        return writingTasks.findById(id).filter(t -> examId.equals(t.getExam().getId())).orElseThrow(this::wrongExam);
    }

    private IeltsSpeakingTask speakingTask(Integer examId, Integer id) {
        if (id == null) throw wrongExam();
        return speakingTasks.findById(id).filter(t -> examId.equals(t.getExam().getId())).orElseThrow(this::wrongExam);
    }

    private int valueOrNext(Integer requested, List<Integer> values) {
        if (requested != null) return requested;
        return values.stream().filter(Objects::nonNull).max(Integer::compareTo).orElse(0) + 1;
    }

    private String firstNonNull(String... values) {
        for (String value : values) if (value != null) return value;
        return null;
    }

    private String normalize(String value) { return value == null ? "" : value.trim(); }

    private ExamSummary summary(ToeicExam e) { return new ExamSummary(e.getId(), e.getExamCode(), e.getExamName(), "TOEIC", e.getStatus(), toeicQuestions.countByExam_Id(e.getId()), toeicAttempts.countByExam_Id(e.getId()), e.getCreatedAt(), e.getUpdatedAt()); }
    private ExamSummary summary(IeltsExam e) { return new ExamSummary(e.getId(), e.getExamCode(), e.getExamName(), "IELTS", e.getStatus(), ieltsQuestions.countByExam_Id(e.getId()), ieltsAttempts.countByExam_Id(e.getId()), e.getCreatedAt(), e.getUpdatedAt()); }
    private String type(String raw) { String t = Objects.toString(raw, "").toLowerCase(Locale.ROOT); if (!t.equals("toeic") && !t.equals("ielts")) throw new IllegalArgumentException("Loại đề thi không hợp lệ."); return t; }
    private String validStatus(String raw) { String s = required(raw, "Trạng thái").toLowerCase(Locale.ROOT); if (!ALLOWED_STATUSES.contains(s)) throw new IllegalArgumentException("Trạng thái đề thi không hợp lệ."); return s; }
    private String toeicAnswer(String raw) { String value = required(raw, "Đáp án đúng").toUpperCase(Locale.ROOT); if (!value.matches("[A-D]")) throw new IllegalArgumentException("Đáp án TOEIC phải là A, B, C hoặc D."); return value; }
    private String required(String value, String label) { if (value == null || value.trim().isEmpty()) throw new IllegalArgumentException(label + " không được để trống."); return value.trim(); }
    private RuntimeException notFound(String type) { return new NoSuchElementException("Không tìm thấy đề " + type + "."); }
    private RuntimeException wrongExam() { return new IllegalArgumentException("Record không tồn tại hoặc không thuộc đề thi đã chọn."); }
}
