package com.englishweb.be.service;

import com.englishweb.be.dto.ielts.IeltsAttemptHistoryResponse;
import com.englishweb.be.dto.ielts.IeltsResultResponse;
import com.englishweb.be.dto.ielts.IeltsSubmitRequest;
import com.englishweb.be.entity.User;
import com.englishweb.be.entity.ielts.IeltsAttempt;
import com.englishweb.be.entity.ielts.IeltsExam;
import com.englishweb.be.entity.ielts.IeltsLrUserAnswer;
import com.englishweb.be.entity.ielts.IeltsQuestion;
import com.englishweb.be.entity.ielts.IeltsQuestionAnswer;
import com.englishweb.be.entity.ielts.IeltsQuestionOption;
import com.englishweb.be.exception.IeltsSubmissionException;
import com.englishweb.be.repository.UserRepository;
import com.englishweb.be.repository.ielts.IeltsAttemptRepository;
import com.englishweb.be.repository.ielts.IeltsExamRepository;
import com.englishweb.be.repository.ielts.IeltsLrUserAnswerRepository;
import com.englishweb.be.repository.ielts.IeltsQuestionAnswerRepository;
import com.englishweb.be.repository.ielts.IeltsQuestionOptionRepository;
import com.englishweb.be.repository.ielts.IeltsQuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IeltsSubmitService {

    private final UserRepository userRepository;
    private final IeltsExamRepository ieltsExamRepository;
    private final IeltsQuestionRepository ieltsQuestionRepository;
    private final IeltsQuestionOptionRepository ieltsQuestionOptionRepository;
    private final IeltsQuestionAnswerRepository ieltsQuestionAnswerRepository;
    private final IeltsAttemptRepository ieltsAttemptRepository;
    private final IeltsLrUserAnswerRepository ieltsLrUserAnswerRepository;
    private final IeltsScoreService ieltsScoreService;

    @Transactional
    public IeltsResultResponse submitExam(Integer examId, String userEmail, String skill, IeltsSubmitRequest request) {
        try {
            return submitExamInternal(examId, userEmail, skill, request);
        } catch (DataAccessException exception) {
            throw new IeltsSubmissionException("Không thể lưu bài làm IELTS. Vui lòng thử lại.", exception);
        }
    }

    private IeltsResultResponse submitExamInternal(
            Integer examId,
            String userEmail,
            String skill,
            IeltsSubmitRequest request
    ) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng!"));

        IeltsExam exam = ieltsExamRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề IELTS!"));

        if ("hidden".equalsIgnoreCase(exam.getStatus())) {
            throw new RuntimeException("Đề IELTS này hiện không được công khai.");
        }
        String normalizedSkill = normalizeSkill(skill);

        List<IeltsQuestion> questions = ieltsQuestionRepository.findByExamIdAndSkill(examId, normalizedSkill);
        if (questions.isEmpty()) {
            throw new RuntimeException("Đề thi IELTS chưa có câu hỏi cho kỹ năng này!");
        }

        Map<Integer, IeltsSubmitRequest.AnswerRequest> selectedMap = buildSelectedMap(request);
        LocalDateTime now = LocalDateTime.now();
        int elapsedSeconds = request == null || request.getElapsedSeconds() == null
                ? 0
                : Math.max(0, request.getElapsedSeconds());

        IeltsAttempt attempt = IeltsAttempt.builder()
                .user(user)
                .exam(exam)
                .attemptType("SKILL_PRACTICE")
                .skill(normalizedSkill)
                .startedAt(now.minusSeconds(elapsedSeconds))
                .submittedAt(now)
                .status("SUBMITTED")
                .build();

        IeltsAttempt savedAttempt = ieltsAttemptRepository.save(attempt);

        int answeredCount = 0;
        int correctCount = 0;
        List<IeltsLrUserAnswer> savedUserAnswers = new ArrayList<>();

        for (IeltsQuestion question : questions) {
            IeltsSubmitRequest.AnswerRequest answerRequest = selectedMap.get(question.getQuestionId());
            String selectedOptionKey = answerRequest == null ? null : normalizeToken(answerRequest.getSelectedOptionKey());
            String answerText = answerRequest == null ? null : normalizeFreeText(answerRequest.getAnswerText());

            boolean isAnswered = selectedOptionKey != null || answerText != null;

            if (isAnswered) {
                answeredCount++;
            }

            IeltsQuestionOption selectedOption = null;
            if (selectedOptionKey != null) {
                selectedOption = ieltsQuestionOptionRepository
                        .findByQuestion_QuestionIdAndOptionKeyIgnoreCase(question.getQuestionId(), selectedOptionKey)
                        .orElse(null);
            }

            IeltsLrUserAnswer savedUserAnswer = ieltsLrUserAnswerRepository.save(IeltsLrUserAnswer.builder()
                    .attempt(savedAttempt)
                    .question(question)
                    .selectedOption(selectedOption)
                    .selectedOptionKey(selectedOptionKey)
                    .answerText(answerText)
                    .isCorrect(false)
                    .answeredAt(isAnswered ? now : null)
                    .build());
            savedUserAnswers.add(savedUserAnswer);
        }

        Map<Integer, List<IeltsQuestionAnswer>> acceptedAnswersByQuestionId = ieltsQuestionAnswerRepository
                .findByQuestion_QuestionIdInOrderByQuestion_QuestionIdAscIdAsc(
                        questions.stream().map(IeltsQuestion::getQuestionId).toList()
                )
                .stream()
                .collect(Collectors.groupingBy(
                        answer -> answer.getQuestion().getQuestionId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        for (IeltsLrUserAnswer userAnswer : savedUserAnswers) {
            List<IeltsQuestionAnswer> acceptedAnswers = acceptedAnswersByQuestionId
                    .getOrDefault(userAnswer.getQuestion().getQuestionId(), List.of());
            boolean isCorrect = isCorrectAnswer(userAnswer, acceptedAnswers);

            userAnswer.setIsCorrect(isCorrect);
            if (isCorrect) {
                correctCount++;
            }
        }

        ieltsLrUserAnswerRepository.saveAllAndFlush(savedUserAnswers);

        BigDecimal bandScore = ieltsScoreService.estimateBand(normalizedSkill, correctCount);

        if ("LISTENING".equals(normalizedSkill)) {
            savedAttempt.setListeningCorrectCount(correctCount);
            savedAttempt.setListeningBand(bandScore);
        } else {
            savedAttempt.setReadingCorrectCount(correctCount);
            savedAttempt.setReadingBand(bandScore);
        }

        savedAttempt.setOverallBand(bandScore);
        savedAttempt.setUpdatedAt(now);
        ieltsAttemptRepository.saveAndFlush(savedAttempt);

        return buildResultResponse(savedAttempt, answeredCount);
    }

    @Transactional(readOnly = true)
    public IeltsResultResponse getResult(Integer attemptId, String userEmail) {
        IeltsAttempt attempt = ieltsAttemptRepository.findByIdAndUser_Email(attemptId, userEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kết quả bài thi IELTS!"));

        int answeredCount = (int) ieltsLrUserAnswerRepository.countAnsweredAnswersByAttemptId(attemptId);
        return buildResultResponse(attempt, answeredCount);
    }

    @Transactional(readOnly = true)
    public List<IeltsAttemptHistoryResponse> getMyAttemptHistory(String userEmail) {
        return ieltsAttemptRepository.findSubmittedLrAttemptsByUserEmail(userEmail)
                .stream()
                .map(attempt -> {
                    String skill = normalizeSkill(attempt.getSkill());
                    BigDecimal bandScore = "READING".equals(skill)
                            ? attempt.getReadingBand()
                            : attempt.getListeningBand();
                    Integer correctCount = "READING".equals(skill)
                            ? attempt.getReadingCorrectCount()
                            : attempt.getListeningCorrectCount();

                    return IeltsAttemptHistoryResponse.builder()
                            .attemptId(attempt.getId())
                            .examId(attempt.getExam().getId())
                            .examCode(attempt.getExam().getExamCode())
                            .examName(attempt.getExam().getExamName())
                            .skill(skill)
                            .bandScore(bandScore)
                            .correctCount(correctCount)
                            .answeredCount(Math.toIntExact(
                                    ieltsLrUserAnswerRepository.countAnsweredAnswersByAttemptId(attempt.getId())
                            ))
                            .totalQuestions(Math.toIntExact(
                                    ieltsLrUserAnswerRepository.countByAttempt_Id(attempt.getId())
                            ))
                            .durationSeconds(calculateElapsedSeconds(attempt))
                            .submittedAt(attempt.getSubmittedAt())
                            .build();
                })
                .toList();
    }

    private IeltsResultResponse buildResultResponse(IeltsAttempt attempt, int answeredCount) {
        List<IeltsLrUserAnswer> answers = ieltsLrUserAnswerRepository.findResultAnswers(attempt.getId());
        List<Integer> questionIds = answers.stream()
                .map(answer -> answer.getQuestion().getQuestionId())
                .distinct()
                .toList();

        Map<Integer, List<IeltsQuestionOption>> optionsByQuestionId = ieltsQuestionOptionRepository
                .findByQuestion_QuestionIdInOrderByQuestion_QuestionIdAscDisplayOrderAscIdAsc(questionIds)
                .stream()
                .collect(Collectors.groupingBy(
                        option -> option.getQuestion().getQuestionId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        Map<Integer, List<IeltsQuestionAnswer>> acceptedAnswersByQuestionId = ieltsQuestionAnswerRepository
                .findByQuestion_QuestionIdInOrderByQuestion_QuestionIdAscIdAsc(questionIds)
                .stream()
                .collect(Collectors.groupingBy(
                        answer -> answer.getQuestion().getQuestionId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        int correctCount = (int) answers.stream()
                .filter(answer -> Boolean.TRUE.equals(answer.getIsCorrect()))
                .count();

        List<IeltsResultResponse.PartSummary> partSummaries = answers.stream()
                .collect(Collectors.groupingBy(answer -> answer.getQuestion().getBlock().getGroup().getPartNo()))
                .entrySet()
                .stream()
                .map(entry -> {
                    List<IeltsLrUserAnswer> partAnswers = entry.getValue();

                    return IeltsResultResponse.PartSummary.builder()
                            .partNo(entry.getKey())
                            .totalQuestions(partAnswers.size())
                            .answeredCount((int) partAnswers.stream().filter(this::isAnswered).count())
                            .correctCount((int) partAnswers.stream().filter(answer -> Boolean.TRUE.equals(answer.getIsCorrect())).count())
                            .build();
                })
                .sorted(Comparator.comparing(IeltsResultResponse.PartSummary::getPartNo))
                .toList();

        List<IeltsResultResponse.QuestionResult> questionResults = answers.stream()
                .map(answer -> {
                    IeltsQuestion question = answer.getQuestion();
                    List<IeltsQuestionOption> options = optionsByQuestionId.getOrDefault(question.getQuestionId(), List.of());
                    List<IeltsQuestionAnswer> acceptedAnswers = acceptedAnswersByQuestionId.getOrDefault(question.getQuestionId(), List.of());

                    return IeltsResultResponse.QuestionResult.builder()
                            .questionId(question.getQuestionId())
                            .questionNo(question.getQuestionNo())
                            .partNo(question.getBlock().getGroup().getPartNo())
                            .groupId(question.getBlock().getGroup().getId())
                            .groupTitle(question.getBlock().getGroup().getTitle())
                            .blockId(question.getBlock().getId())
                            .blockType(question.getBlock().getQuestionType())
                            .sharedText(question.getBlock().getGroup().getSharedText())
                            .promptText(question.getPromptText())
                            .selectedOptionKey(answer.getSelectedOptionKey())
                            .selectedAnswerText(answer.getAnswerText())
                            .isCorrect(answer.getIsCorrect())
                            .isAnswered(isAnswered(answer))
                            .explanationText(question.getExplanationText())
                            .options(options.stream()
                                    .map(option -> IeltsResultResponse.OptionResult.builder()
                                            .optionKey(option.getOptionKey())
                                            .optionText(option.getOptionText())
                                            .build())
                                    .toList())
                            .correctAnswers(acceptedAnswers.stream()
                                    .map(acceptedAnswer -> IeltsResultResponse.CorrectAnswer.builder()
                                            .answerKey(acceptedAnswer.getAnswerKey())
                                            .answerText(acceptedAnswer.getAnswerText())
                                            .build())
                                    .toList())
                            .build();
                })
                .toList();

        String skill = normalizeSkill(attempt.getSkill());
        BigDecimal bandScore = "READING".equals(skill)
                ? defaultIfNull(attempt.getReadingBand(), ieltsScoreService.estimateBand(skill, correctCount))
                : defaultIfNull(attempt.getListeningBand(), ieltsScoreService.estimateBand(skill, correctCount));

        return IeltsResultResponse.builder()
                .attemptId(attempt.getId())
                .examId(attempt.getExam().getId())
                .examCode(attempt.getExam().getExamCode())
                .examName(attempt.getExam().getExamName())
                .skill(skill)
                .totalQuestions(answers.size())
                .answeredCount(answeredCount)
                .correctCount(correctCount)
                .bandScore(bandScore)
                .elapsedSeconds(calculateElapsedSeconds(attempt))
                .submittedAt(attempt.getSubmittedAt())
                .partSummaries(partSummaries)
                .questionResults(questionResults)
                .build();
    }

    private int calculateElapsedSeconds(IeltsAttempt attempt) {
        if (attempt.getStartedAt() == null || attempt.getSubmittedAt() == null) {
            return 0;
        }

        return (int) Math.max(0, Duration.between(attempt.getStartedAt(), attempt.getSubmittedAt()).getSeconds());
    }

    private Map<Integer, IeltsSubmitRequest.AnswerRequest> buildSelectedMap(IeltsSubmitRequest request) {
        if (request == null || request.getAnswers() == null) {
            return Map.of();
        }

        return request.getAnswers().stream()
                .filter(answer -> answer.getQuestionId() != null)
                .collect(Collectors.toMap(
                        IeltsSubmitRequest.AnswerRequest::getQuestionId,
                        answer -> new IeltsSubmitRequest.AnswerRequest(
                                answer.getQuestionId(),
                                normalizeToken(answer.getSelectedOptionKey()),
                                normalizeFreeText(answer.getAnswerText())
                        ),
                        (left, right) -> right,
                        LinkedHashMap::new
                ));
    }

    private boolean isCorrectAnswer(IeltsLrUserAnswer userAnswer, List<IeltsQuestionAnswer> acceptedAnswers) {
        Set<String> submittedTokens = Stream.of(userAnswer.getSelectedOptionKey(), userAnswer.getAnswerText())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (submittedTokens.isEmpty()) {
            return false;
        }

        for (IeltsQuestionAnswer acceptedAnswer : acceptedAnswers) {
            String answerKey = normalizeToken(acceptedAnswer.getAnswerKey());
            String normalizedAnswerText = normalizeFreeText(acceptedAnswer.getAnswerText());

            if ((answerKey != null && submittedTokens.contains(answerKey))
                    || (normalizedAnswerText != null && submittedTokens.contains(normalizedAnswerText))) {
                return true;
            }
        }

        return false;
    }

    private boolean isAnswered(IeltsLrUserAnswer answer) {
        return normalizeToken(answer.getSelectedOptionKey()) != null
                || normalizeFreeText(answer.getAnswerText()) != null;
    }

    private BigDecimal defaultIfNull(BigDecimal value, BigDecimal fallback) {
        return value != null ? value : fallback;
    }

    private String normalizeSkill(String skill) {
        String normalized = skill == null ? "" : skill.trim().toUpperCase(Locale.ROOT);

        if (!"LISTENING".equals(normalized) && !"READING".equals(normalized)) {
            throw new RuntimeException("Kỹ năng IELTS chưa được hỗ trợ hoặc không hợp lệ!");
        }

        return normalized;
    }

    private String normalizeToken(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeFreeText(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim()
                .replaceAll("\\s+", " ")
                .toUpperCase(Locale.ROOT);

        return normalized.isBlank() ? null : normalized;
    }
}
