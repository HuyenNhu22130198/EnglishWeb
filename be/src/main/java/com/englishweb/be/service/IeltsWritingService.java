package com.englishweb.be.service;

import com.englishweb.be.dto.ielts.GeminiErrorItem;
import com.englishweb.be.dto.ielts.IeltsAttemptHistoryResponse;
import com.englishweb.be.dto.ielts.IeltsSubmitRequest;
import com.englishweb.be.dto.ielts.IeltsWritingGradeResponse;
import com.englishweb.be.dto.ielts.IeltsWritingResultResponse;
import com.englishweb.be.dto.ielts.IeltsWritingSubmitResponse;
import com.englishweb.be.dto.ielts.IeltsWritingTaskRequirement;
import com.englishweb.be.entity.User;
import com.englishweb.be.entity.ielts.IeltsAttempt;
import com.englishweb.be.entity.ielts.IeltsExam;
import com.englishweb.be.entity.ielts.IeltsMediaAsset;
import com.englishweb.be.entity.ielts.IeltsWritingSampleAnswer;
import com.englishweb.be.entity.ielts.IeltsWritingTask;
import com.englishweb.be.entity.ielts.IeltsWritingUserAnswer;
import com.englishweb.be.exception.IeltsSubmissionException;
import com.englishweb.be.repository.UserRepository;
import com.englishweb.be.repository.ielts.IeltsAttemptRepository;
import com.englishweb.be.repository.ielts.IeltsExamRepository;
import com.englishweb.be.repository.ielts.IeltsMediaAssetRepository;
import com.englishweb.be.repository.ielts.IeltsWritingSampleAnswerRepository;
import com.englishweb.be.repository.ielts.IeltsWritingTaskRepository;
import com.englishweb.be.repository.ielts.IeltsWritingUserAnswerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IeltsWritingService {

    private static final String WRITING = "WRITING";
    private static final Pattern WORD_PATTERN = Pattern.compile("[\\p{L}\\p{N}]+(?:['-][\\p{L}\\p{N}]+)*");

    private final UserRepository userRepository;
    private final IeltsExamRepository ieltsExamRepository;
    private final IeltsAttemptRepository ieltsAttemptRepository;
    private final IeltsMediaAssetRepository ieltsMediaAssetRepository;
    private final IeltsWritingTaskRepository writingTaskRepository;
    private final IeltsWritingSampleAnswerRepository sampleAnswerRepository;
    private final IeltsWritingUserAnswerRepository userAnswerRepository;
    private final GeminiWritingGradingService writingGradingService;
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Transactional
    public IeltsWritingSubmitResponse submit(Integer examId, String userEmail, IeltsSubmitRequest request) {
        try {
            return submitInternal(examId, userEmail, request);
        } catch (DataAccessException exception) {
            throw new IeltsSubmissionException("Không thể lưu bài Writing. Vui lòng thử lại.", exception);
        }
    }

    private IeltsWritingSubmitResponse submitInternal(Integer examId, String userEmail, IeltsSubmitRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng!"));
        IeltsExam exam = ieltsExamRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề IELTS!"));

        if ("hidden".equalsIgnoreCase(exam.getStatus())) {
            throw new RuntimeException("Đề IELTS này hiện không được công khai.");
        }
        List<IeltsWritingTask> writingTasks = writingTaskRepository.findByExam_IdOrderByTaskNoAscDisplayOrderAscIdAsc(examId);
        Map<Integer, IeltsWritingTask> tasksById = writingTasks.stream()
                .collect(Collectors.toMap(IeltsWritingTask::getId, Function.identity(), (left, right) -> left));
        Map<Integer, IeltsWritingTask> tasksByNo = writingTasks.stream()
                .filter(task -> task.getTaskNo() != null)
                .collect(Collectors.toMap(IeltsWritingTask::getTaskNo, Function.identity(), (left, right) -> left));

        if (!tasksByNo.containsKey(1) || !tasksByNo.containsKey(2)) {
            throw new RuntimeException("Đề IELTS Writing chưa có đủ Task 1 và Task 2.");
        }

        Map<Integer, IeltsSubmitRequest.WritingAnswerRequest> submittedByTaskNo = request == null
                || request.getTasks() == null
                ? Map.of()
                : request.getTasks().stream()
                        .filter(Objects::nonNull)
                        .filter(answer -> answer.getTaskNo() != null)
                        .collect(Collectors.toMap(
                                IeltsSubmitRequest.WritingAnswerRequest::getTaskNo,
                                Function.identity(),
                                (left, right) -> right,
                                LinkedHashMap::new
                        ));

        int elapsedSeconds = request == null || request.getElapsedSeconds() == null
                ? 0
                : Math.max(0, request.getElapsedSeconds());
        LocalDateTime now = LocalDateTime.now();
        IeltsAttempt attempt = ieltsAttemptRepository.save(IeltsAttempt.builder()
                .user(user)
                .exam(exam)
                .attemptType("SKILL_PRACTICE")
                .skill(WRITING)
                .startedAt(now.minusSeconds(elapsedSeconds))
                .submittedAt(now)
                .status("SUBMITTED")
                .build());

        for (int taskNo = 1; taskNo <= 2; taskNo++) {
            IeltsSubmitRequest.WritingAnswerRequest submitted = submittedByTaskNo.get(taskNo);
            IeltsWritingTask task = resolveTask(taskNo, submitted, tasksById, tasksByNo);
            String answerText = submitted == null || submitted.getAnswerText() == null
                    ? ""
                    : submitted.getAnswerText().trim();
            IeltsWritingSampleAnswer sample = sampleAnswerRepository
                    .findFirstByTask_IdAndDisplayOrderOrderByIdAsc(task.getId(), 1)
                    .or(() -> sampleAnswerRepository.findFirstByTask_IdOrderByDisplayOrderAscIdAsc(task.getId()))
                    .orElse(null);

            GeminiWritingGradingService.GradingResult grade =
                    writingGradingService.grade(task.getPromptText(), answerText);

            userAnswerRepository.save(IeltsWritingUserAnswer.builder()
                    .attempt(attempt)
                    .task(task)
                    .sampleAnswer(sample)
                    .answerText(answerText)
                    .wordCount(countWords(answerText))
                    .submittedAt(now)
                    .geminiStatus(grade.status())
                    .geminiError(grade.error())
                    .topicRelevance(grade.topicRelevance())
                    .answersQuestion(grade.answersQuestion())
                    .taskResponsePercent(grade.taskResponsePercent())
                    .coherencePercent(grade.coherencePercent())
                    .vocabularyPercent(grade.vocabularyPercent())
                    .grammarPercent(grade.grammarPercent())
                    .overallQualityPercent(grade.overallQualityPercent())
                    .geminiSummary(grade.summary())
                    .taskRequirementsJson(writeRequirements(grade.taskRequirements()))
                    .strengthsJson(writeStrings(grade.strengths()))
                    .errorsJson(writeErrors(grade.errors()))
                    .correctedAnswerText(grade.correctedAnswer())
                    .geminiRawJson(grade.rawJson())
                    .gradedAt(LocalDateTime.now())
                    .build());
        }

        userAnswerRepository.flush();
        return new IeltsWritingSubmitResponse(attempt.getId());
    }

    @Transactional(readOnly = true)
    public boolean isWritingAttempt(Integer attemptId, String userEmail) {
        return ieltsAttemptRepository.findByIdAndUser_Email(attemptId, userEmail)
                .map(attempt -> WRITING.equalsIgnoreCase(attempt.getSkill()))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public IeltsWritingResultResponse getResult(Integer attemptId, String userEmail) {
        IeltsAttempt attempt = ieltsAttemptRepository.findByIdAndUser_Email(attemptId, userEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kết quả bài thi IELTS!"));
        if (!WRITING.equalsIgnoreCase(attempt.getSkill())) {
            throw new RuntimeException("Kết quả này không phải bài IELTS Writing.");
        }

        List<IeltsWritingUserAnswer> answers = userAnswerRepository.findResultAnswers(attemptId);
        Map<Integer, IeltsMediaAsset> fallbackAssets = ieltsMediaAssetRepository
                .findByExam_IdAndSkillIgnoreCaseOrderByPartNoAscDisplayOrderAscIdAsc(attempt.getExam().getId(), WRITING)
                .stream()
                .filter(asset -> asset.getPartNo() != null)
                .collect(Collectors.toMap(IeltsMediaAsset::getPartNo, Function.identity(), (left, right) -> left));

        return IeltsWritingResultResponse.builder()
                .attemptId(attempt.getId())
                .examId(attempt.getExam().getId())
                .examCode(attempt.getExam().getExamCode())
                .examName(attempt.getExam().getExamName())
                .skill(WRITING)
                .durationSeconds(calculateDuration(attempt))
                .submittedAt(attempt.getSubmittedAt())
                .tasks(answers.stream().map(answer -> toTaskResult(answer, fallbackAssets)).toList())
                .build();
    }

    @Transactional
    public IeltsWritingGradeResponse gradeAnswer(Integer userAnswerId, String userEmail) {
        IeltsWritingUserAnswer answer = userAnswerRepository.findById(userAnswerId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài Writing đã nộp."));
        if (!Objects.equals(answer.getAttempt().getUser().getEmail(), userEmail)) {
            throw new RuntimeException("Bạn không có quyền chấm bài này.");
        }
        if (answer.getAnswerText() == null || answer.getAnswerText().isBlank()) {
            throw new RuntimeException("Không thể chấm bài trống bằng AI.");
        }

        GeminiWritingGradingService.GradingResult grade =
                writingGradingService.grade(answer.getTask().getPromptText(), answer.getAnswerText());
        answer.setGeminiStatus(grade.status());
        answer.setGeminiError(grade.error());
        answer.setTopicRelevance(grade.topicRelevance());
        answer.setAnswersQuestion(grade.answersQuestion());
        answer.setTaskResponsePercent(grade.taskResponsePercent());
        answer.setCoherencePercent(grade.coherencePercent());
        answer.setVocabularyPercent(grade.vocabularyPercent());
        answer.setGrammarPercent(grade.grammarPercent());
        answer.setOverallQualityPercent(grade.overallQualityPercent());
        answer.setGeminiSummary(grade.summary());
        answer.setTaskRequirementsJson(writeRequirements(grade.taskRequirements()));
        answer.setStrengthsJson(writeStrings(grade.strengths()));
        answer.setErrorsJson(writeErrors(grade.errors()));
        answer.setCorrectedAnswerText(grade.correctedAnswer());
        answer.setGeminiRawJson(grade.rawJson());
        answer.setGradedAt(LocalDateTime.now());
        answer = userAnswerRepository.save(answer);
        return toGradeResponse(answer);
    }

    @Transactional(readOnly = true)
    public List<IeltsAttemptHistoryResponse> getHistory(String userEmail) {
        return ieltsAttemptRepository.findSubmittedWritingAttemptsByUserEmail(userEmail).stream()
                .map(attempt -> {
                    Map<Integer, IeltsWritingUserAnswer> byTask = userAnswerRepository.findResultAnswers(attempt.getId())
                            .stream()
                            .collect(Collectors.toMap(a -> a.getTask().getTaskNo(), Function.identity(), (left, right) -> left));
                    IeltsWritingUserAnswer task1 = byTask.get(1);
                    IeltsWritingUserAnswer task2 = byTask.get(2);
                    int task1Words = valueOrZero(task1 == null ? null : task1.getWordCount());
                    int task2Words = valueOrZero(task2 == null ? null : task2.getWordCount());

                    return IeltsAttemptHistoryResponse.builder()
                            .attemptId(attempt.getId())
                            .examId(attempt.getExam().getId())
                            .examCode(attempt.getExam().getExamCode())
                            .examName(attempt.getExam().getExamName())
                            .skill(WRITING)
                            .durationSeconds(calculateDuration(attempt))
                            .submittedAt(attempt.getSubmittedAt())
                            .totalWordCount(task1Words + task2Words)
                            .task1WordCount(task1Words)
                            .task2WordCount(task2Words)
                            .task1OverallQualityPercent(task1 == null ? null : task1.getOverallQualityPercent())
                            .task2OverallQualityPercent(task2 == null ? null : task2.getOverallQualityPercent())
                            .build();
                })
                .toList();
    }

    private IeltsWritingTask resolveTask(
            int taskNo,
            IeltsSubmitRequest.WritingAnswerRequest submitted,
            Map<Integer, IeltsWritingTask> tasksById,
            Map<Integer, IeltsWritingTask> tasksByNo
    ) {
        if (submitted == null || submitted.getTaskId() == null) {
            return tasksByNo.get(taskNo);
        }

        IeltsWritingTask task = tasksById.get(submitted.getTaskId());
        if (task == null || !Objects.equals(task.getTaskNo(), taskNo)) {
            throw new RuntimeException("Task Writing không thuộc đề thi đang làm.");
        }
        return task;
    }

    private IeltsWritingResultResponse.TaskResult toTaskResult(
            IeltsWritingUserAnswer answer,
            Map<Integer, IeltsMediaAsset> fallbackAssets
    ) {
        IeltsWritingTask task = answer.getTask();
        IeltsMediaAsset asset = fallbackAssets.get(task.getTaskNo());

        IeltsWritingSampleAnswer sample = answer.getSampleAnswer();
        return IeltsWritingResultResponse.TaskResult.builder()
                .taskId(task.getId())
                .taskNo(task.getTaskNo())
                .prompt(task.getPromptText())
                .instruction(task.getInstructionText())
                .material(null)
                .imageUrl(asset == null ? null : asset.getAssetUrl())
                .userAnswer(answer.getAnswerText())
                .userWordCount(valueOrZero(answer.getWordCount()))
                .sampleAnswer(sample == null ? null : sample.getAnswerText())
                .sampleAnswerId(sample == null ? null : sample.getId())
                .userAnswerId(answer.getId())
                .geminiStatus(answer.getGeminiStatus())
                .geminiError(answer.getGeminiError())
                .topicRelevance(answer.getTopicRelevance())
                .answersQuestion(answer.getAnswersQuestion())
                .taskResponsePercent(answer.getTaskResponsePercent())
                .coherencePercent(answer.getCoherencePercent())
                .vocabularyPercent(answer.getVocabularyPercent())
                .grammarPercent(answer.getGrammarPercent())
                .overallQualityPercent(answer.getOverallQualityPercent())
                .geminiSummary(answer.getGeminiSummary())
                .taskRequirements(readRequirements(answer.getTaskRequirementsJson()))
                .strengths(readStrings(answer.getStrengthsJson()))
                .errors(readErrors(answer.getErrorsJson()))
                .correctedAnswerText(answer.getCorrectedAnswerText())
                .build();
    }

    private IeltsWritingGradeResponse toGradeResponse(IeltsWritingUserAnswer answer) {
        return IeltsWritingGradeResponse.builder()
                .userAnswerId(answer.getId())
                .geminiStatus(answer.getGeminiStatus())
                .geminiError(answer.getGeminiError())
                .topicRelevance(answer.getTopicRelevance())
                .answersQuestion(answer.getAnswersQuestion())
                .taskResponsePercent(answer.getTaskResponsePercent())
                .coherencePercent(answer.getCoherencePercent())
                .vocabularyPercent(answer.getVocabularyPercent())
                .grammarPercent(answer.getGrammarPercent())
                .overallQualityPercent(answer.getOverallQualityPercent())
                .summary(answer.getGeminiSummary())
                .taskRequirements(readRequirements(answer.getTaskRequirementsJson()))
                .strengths(readStrings(answer.getStrengthsJson()))
                .errors(readErrors(answer.getErrorsJson()))
                .correctedAnswerText(answer.getCorrectedAnswerText())
                .build();
    }

    private String writeErrors(List<GeminiErrorItem> errors) {
        try {
            return jsonMapper.writeValueAsString(errors == null ? List.of() : errors);
        } catch (Exception exception) {
            return "[]";
        }
    }

    private List<GeminiErrorItem> readErrors(String json) {
        List<GeminiErrorItem> errors = new ArrayList<>();
        if (json == null || json.isBlank()) return errors;
        try {
            JsonNode root = jsonMapper.readTree(json);
            if (!root.isArray()) return errors;
            for (JsonNode item : root) {
                errors.add(GeminiErrorItem.builder()
                        .type(item.path("type").asText(""))
                        .original(item.path("original").asText(""))
                        .suggestion(item.path("suggestion").asText(""))
                        .explanation(item.path("explanation").asText(""))
                        .build());
            }
        } catch (Exception ignored) {
            // Keep the API usable if stored diagnostic JSON is malformed.
        }
        return errors;
    }

    private String writeRequirements(List<IeltsWritingTaskRequirement> requirements) {
        try {
            return jsonMapper.writeValueAsString(requirements == null ? List.of() : requirements);
        } catch (Exception exception) {
            return "[]";
        }
    }

    private List<IeltsWritingTaskRequirement> readRequirements(String json) {
        List<IeltsWritingTaskRequirement> requirements = new ArrayList<>();
        if (json == null || json.isBlank()) return requirements;
        try {
            JsonNode root = jsonMapper.readTree(json);
            if (!root.isArray()) return requirements;
            for (JsonNode item : root) {
                requirements.add(IeltsWritingTaskRequirement.builder()
                        .requirement(item.path("requirement").asText(""))
                        .addressed(item.path("addressed").asBoolean(false))
                        .candidateEvidence(item.path("candidateEvidence").asText(""))
                        .explanation(item.path("explanation").asText(""))
                        .build());
            }
        } catch (Exception ignored) {
            // Keep the API usable if stored diagnostic JSON is malformed.
        }
        return requirements;
    }

    private String writeStrings(List<String> values) {
        try {
            return jsonMapper.writeValueAsString(values == null ? List.of() : values);
        } catch (Exception exception) {
            return "[]";
        }
    }

    private List<String> readStrings(String json) {
        List<String> values = new ArrayList<>();
        if (json == null || json.isBlank()) return values;
        try {
            JsonNode root = jsonMapper.readTree(json);
            if (!root.isArray()) return values;
            for (JsonNode item : root) {
                values.add(item.asText(""));
            }
        } catch (Exception ignored) {
            // Keep the API usable if stored diagnostic JSON is malformed.
        }
        return values;
    }

    private int countWords(String text) {
        Matcher matcher = WORD_PATTERN.matcher(text == null ? "" : text);
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }

    private int calculateDuration(IeltsAttempt attempt) {
        if (attempt.getStartedAt() == null || attempt.getSubmittedAt() == null) {
            return 0;
        }
        return Math.toIntExact(Math.max(0, Duration.between(attempt.getStartedAt(), attempt.getSubmittedAt()).getSeconds()));
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }
}
