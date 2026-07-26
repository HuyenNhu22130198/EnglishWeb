package com.englishweb.be.service;

import com.englishweb.be.dto.ielts.IeltsAttemptHistoryResponse;
import com.englishweb.be.dto.ielts.IeltsSubmitRequest;
import com.englishweb.be.dto.ielts.IeltsWritingResultResponse;
import com.englishweb.be.dto.ielts.IeltsWritingSubmitResponse;
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

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
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
    private final IeltsWritingSimilarityService similarityService;

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
            IeltsWritingSimilarityService.SimilarityResult similarity = sample == null
                    ? new IeltsWritingSimilarityService.SimilarityResult(0, BigDecimal.ZERO.setScale(2))
                    : similarityService.compare(answerText, sample.getAnswerText());

            userAnswerRepository.save(IeltsWritingUserAnswer.builder()
                    .attempt(attempt)
                    .task(task)
                    .sampleAnswer(sample)
                    .answerText(answerText)
                    .wordCount(countWords(answerText))
                    .matchedWordCount(similarity.matchedWordCount())
                    .similarityPercent(similarity.similarityPercent())
                    .submittedAt(now)
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
                            .task1SimilarityPercent(percentOrZero(task1))
                            .task2SimilarityPercent(percentOrZero(task2))
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
                .matchedWordCount(valueOrZero(answer.getMatchedWordCount()))
                .similarityPercent(answer.getSimilarityPercent() == null
                        ? BigDecimal.ZERO.setScale(2)
                        : answer.getSimilarityPercent())
                .build();
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

    private BigDecimal percentOrZero(IeltsWritingUserAnswer answer) {
        return answer == null || answer.getSimilarityPercent() == null
                ? BigDecimal.ZERO.setScale(2)
                : answer.getSimilarityPercent();
    }
}
