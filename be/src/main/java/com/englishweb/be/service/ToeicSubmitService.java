package com.englishweb.be.service;

import com.englishweb.be.dto.toeic.ToeicAttemptHistoryResponse;
import com.englishweb.be.dto.toeic.ToeicResultResponse;
import com.englishweb.be.dto.toeic.ToeicSubmitRequest;
import com.englishweb.be.entity.User;
import com.englishweb.be.entity.toeic.ToeicAttempt;
import com.englishweb.be.entity.toeic.ToeicExam;
import com.englishweb.be.entity.toeic.ToeicQuestion;
import com.englishweb.be.entity.toeic.ToeicQuestionOption;
import com.englishweb.be.entity.toeic.ToeicUserAnswer;
import com.englishweb.be.repository.UserRepository;
import com.englishweb.be.repository.toeic.ToeicAttemptRepository;
import com.englishweb.be.repository.toeic.ToeicExamRepository;
import com.englishweb.be.repository.toeic.ToeicGroupMaterialRepository;
import com.englishweb.be.repository.toeic.ToeicQuestionOptionRepository;
import com.englishweb.be.repository.toeic.ToeicQuestionRepository;
import com.englishweb.be.repository.toeic.ToeicUserAnswerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ToeicSubmitService {

    private final UserRepository userRepository;
    private final ToeicExamRepository toeicExamRepository;
    private final ToeicQuestionRepository toeicQuestionRepository;
    private final ToeicQuestionOptionRepository toeicQuestionOptionRepository;
    private final ToeicGroupMaterialRepository toeicGroupMaterialRepository;
    private final ToeicAttemptRepository toeicAttemptRepository;
    private final ToeicUserAnswerRepository toeicUserAnswerRepository;
    private final ToeicScoreService toeicScoreService;
//     private final ObjectMapper objectMapper;

    @Transactional
    public ToeicResultResponse submitExam(
            Integer examId,
            String userEmail,
            List<Integer> parts,
            ToeicSubmitRequest request
    ) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng!"));

        ToeicExam exam = toeicExamRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề TOEIC!"));

        Set<Integer> selectedParts = normalizeParts(parts);

        List<ToeicQuestion> questions = toeicQuestionRepository.findByExam_IdOrderByQuestionNoAsc(examId)
                .stream()
                .filter(question -> shouldIncludeQuestion(question, selectedParts))
                .toList();

        if (questions.isEmpty()) {
            throw new RuntimeException("Đề thi chưa có câu hỏi!");
        }

        Map<Integer, String> selectedMap = buildSelectedMap(request);

        int answeredCount = 0;
        int correctCount = 0;
        int listeningCorrect = 0;

        LocalDateTime now = LocalDateTime.now();

        ToeicAttempt attempt = ToeicAttempt.builder()
                .user(user)
                .exam(exam)
                .startedAt(now)
                .submittedAt(now)
                .totalQuestions(questions.size())
                .correctCount(0)
                .score(BigDecimal.ZERO)
                .status("SUBMITTED")
                .build();

        ToeicAttempt savedAttempt = toeicAttemptRepository.save(attempt);

        for (ToeicQuestion question : questions) {
            String selectedLabel = normalizeLabel(selectedMap.get(question.getId()));
            String correctLabel = normalizeLabel(question.getCorrectOption());

            boolean isAnswered = selectedLabel != null && !selectedLabel.isBlank();
            boolean isCorrect = isAnswered && selectedLabel.equalsIgnoreCase(correctLabel);

            if (isAnswered) {
                answeredCount++;
            }

            if (isCorrect) {
                correctCount++;

                if (isListeningQuestion(question)) {
                    listeningCorrect++;
                }
            }

            ToeicQuestionOption selectedOption = null;

            if (isAnswered) {
                selectedOption = toeicQuestionOptionRepository
                        .findByQuestion_IdAndOptionLabelIgnoreCase(question.getId(), selectedLabel)
                        .orElse(null);
            }

            ToeicUserAnswer userAnswer = ToeicUserAnswer.builder()
                    .attempt(savedAttempt)
                    .question(question)
                    .selectedOption(selectedOption)
                    .selectedLabel(selectedLabel)
                    .isCorrect(isCorrect)
                    .answeredAt(isAnswered ? now : null)
                    .build();

            toeicUserAnswerRepository.save(userAnswer);
        }

        int readingCorrect = correctCount - listeningCorrect;

        int listeningScore = toeicScoreService.getListeningScore(listeningCorrect);
        int readingScore = toeicScoreService.getReadingScore(readingCorrect);
        int totalScore = listeningScore + readingScore;

        savedAttempt.setCorrectCount(correctCount);
        savedAttempt.setScore(BigDecimal.valueOf(totalScore));
        savedAttempt.setUpdatedAt(now);

        toeicAttemptRepository.save(savedAttempt);

        return buildResultResponse(savedAttempt, answeredCount);
    }

    private Set<Integer> normalizeParts(List<Integer> parts) {
        if (parts == null || parts.isEmpty()) {
            return Set.of();
        }

        Set<Integer> normalizedParts = new LinkedHashSet<>();

        for (Integer part : parts) {
            if (part != null && part >= 1 && part <= 7) {
                normalizedParts.add(part);
            }
        }

        return normalizedParts;
    }

    private boolean shouldIncludeQuestion(ToeicQuestion question, Set<Integer> selectedParts) {
        if (selectedParts.isEmpty()) {
            return true;
        }

        return question.getGroup() != null
                && selectedParts.contains(question.getGroup().getPartNo());
    }

    @Transactional(readOnly = true)
    public ToeicResultResponse getResult(Integer attemptId, String userEmail) {
        ToeicAttempt attempt = toeicAttemptRepository.findByIdAndUser_Email(attemptId, userEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kết quả bài thi!"));

        int answeredCount = (int) toeicUserAnswerRepository.findResultAnswers(attemptId)
                .stream()
                .filter(answer -> answer.getSelectedLabel() != null && !answer.getSelectedLabel().isBlank())
                .count();

        return buildResultResponse(attempt, answeredCount);
    }

    @Transactional(readOnly = true)
    public List<ToeicAttemptHistoryResponse> getMyAttemptHistory(String userEmail) {
        List<ToeicAttempt> attempts = toeicAttemptRepository.findSubmittedAttemptsByUserEmail(userEmail);
        List<ToeicAttemptHistoryResponse> history = new ArrayList<>();

        for (ToeicAttempt attempt : attempts) {
             int answeredCount = (int) toeicUserAnswerRepository.countAnsweredAnswersByAttemptId(attempt.getId());
            ToeicResultResponse result = buildResultResponse(attempt, answeredCount);

            history.add(ToeicAttemptHistoryResponse.builder()
                    .attemptId(result.getAttemptId())
                    .examId(result.getExamId())
                    .examCode(result.getExamCode())
                    .examName(result.getExamName())
                    .totalQuestions(result.getTotalQuestions())
                    .answeredCount(result.getAnsweredCount())
                    .correctCount(result.getCorrectCount())
                    .listeningCorrect(result.getListeningCorrect())
                    .readingCorrect(result.getReadingCorrect())
                    .listeningScore(result.getListeningScore())
                    .readingScore(result.getReadingScore())
                    .totalScore(result.getTotalScore())
                    .submittedAt(result.getSubmittedAt())
                    .status(attempt.getStatus())
                    .partSummaries(result.getPartSummaries())
                    .build());
        }

        return history;
    }

    private Map<Integer, String> buildSelectedMap(ToeicSubmitRequest request) {
        if (request == null || request.getAnswers() == null) {
            return Map.of();
        }

        return request.getAnswers()
                .stream()
                .filter(answer -> answer.getQuestionId() != null)
                .collect(Collectors.toMap(
                        ToeicSubmitRequest.AnswerRequest::getQuestionId,
                        answer -> normalizeLabel(answer.getSelectedLabel()),
                        (oldValue, newValue) -> newValue
                ));
    }

    private ToeicResultResponse buildResultResponse(ToeicAttempt attempt, int answeredCount) {
        List<ToeicUserAnswer> answers = toeicUserAnswerRepository.findResultAnswers(attempt.getId());
        List<Integer> questionIds = answers.stream()
                .map(answer -> answer.getQuestion().getId())
                .distinct()
                .toList();
        Map<Integer, List<ToeicQuestionOption>> optionsByQuestionId = toeicQuestionOptionRepository
                .findByQuestion_IdInOrderByQuestion_IdAscDisplayOrderAsc(questionIds)
                .stream()
                .collect(Collectors.groupingBy(
                        option -> option.getQuestion().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
        Map<Integer, List<String>> groupImageUrlsByGroupId = answers.stream()
                .map(answer -> answer.getQuestion().getGroup())
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(
                        group -> group.getId(),
                        group -> toeicGroupMaterialRepository.findByGroup_IdOrderByDisplayOrderAsc(group.getId())
                                .stream()
                                .filter(this::isImageMaterial)
                                .map(material -> material.getAssetUrl() != null ? material.getAssetUrl().trim() : null)
                                .filter(url -> url != null && !url.isBlank())
                                .distinct()
                                .toList(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        int listeningCorrect = (int) answers.stream()
                .filter(answer -> Boolean.TRUE.equals(answer.getIsCorrect()))
                .filter(answer -> isListeningQuestion(answer.getQuestion()))
                .count();

        int readingCorrect = (int) answers.stream()
                .filter(answer -> Boolean.TRUE.equals(answer.getIsCorrect()))
                .filter(answer -> !isListeningQuestion(answer.getQuestion()))
                .count();

        int listeningScore = toeicScoreService.getListeningScore(listeningCorrect);
        int readingScore = toeicScoreService.getReadingScore(readingCorrect);
        int totalScore = listeningScore + readingScore;

        List<ToeicResultResponse.PartSummary> partSummaries = answers.stream()
                .collect(Collectors.groupingBy(answer -> answer.getQuestion().getGroup().getPartNo()))
                .entrySet()
                .stream()
                .map(entry -> {
                    Integer partNo = entry.getKey();
                    List<ToeicUserAnswer> partAnswers = entry.getValue();

                    int total = partAnswers.size();
                    int answered = (int) partAnswers.stream()
                            .filter(answer -> answer.getSelectedLabel() != null && !answer.getSelectedLabel().isBlank())
                            .count();
                    int correct = (int) partAnswers.stream()
                            .filter(answer -> Boolean.TRUE.equals(answer.getIsCorrect()))
                            .count();

                    return ToeicResultResponse.PartSummary.builder()
                            .partNo(partNo)
                            .totalQuestions(total)
                            .answeredCount(answered)
                            .correctCount(correct)
                            .build();
                })
                .sorted(Comparator.comparing(ToeicResultResponse.PartSummary::getPartNo))
                .toList();

        List<ToeicResultResponse.QuestionResult> questionResults = answers.stream()
                .map(answer -> {
                    ToeicQuestion question = answer.getQuestion();
                    Integer questionId = question.getId();
                    Integer partNo = question.getGroup().getPartNo();
                    String correctLabel = normalizeLabel(question.getCorrectOption());
                    ToeicQuestionOption selectedOption = answer.getSelectedOption();
                    List<ToeicQuestionOption> questionOptions = optionsByQuestionId.getOrDefault(questionId, List.of());
                    ToeicQuestionOption correctOption = questionOptions.stream()
                            .filter(option -> option.getOptionLabel() != null
                                    && option.getOptionLabel().equalsIgnoreCase(correctLabel))
                            .findFirst()
                            .orElse(null);

                    String selectedText = selectedOption != null ? selectedOption.getOptionText() : null;
                    if (selectedText == null && answer.getSelectedLabel() != null) {
                        selectedText = questionOptions.stream()
                                .filter(option -> option.getOptionLabel() != null
                                        && option.getOptionLabel().equalsIgnoreCase(answer.getSelectedLabel()))
                                .map(ToeicQuestionOption::getOptionText)
                                .filter(Objects::nonNull)
                                .findFirst()
                                .orElse(null);
                    }

                    String correctText = correctOption != null ? correctOption.getOptionText() : null;
                    List<ToeicResultResponse.OptionResult> optionResults = questionOptions.stream()
                            .map(option -> ToeicResultResponse.OptionResult.builder()
                                    .optionLabel(option.getOptionLabel())
                                    .optionText(option.getOptionText())
                                    .build())
                            .toList();

                    return ToeicResultResponse.QuestionResult.builder()
                            .questionId(questionId)
                            .questionNo(question.getQuestionNo())
                            .partNo(partNo)
                            .groupId(question.getGroup().getId())
                            .groupTitle(question.getGroup().getTitle())
                            .sharedText(question.getGroup().getSharedText())
                            .groupImageUrls(groupImageUrlsByGroupId.getOrDefault(question.getGroup().getId(), List.of()))
                            .questionText(question.getQuestionText())
                            .imageUrl(question.getImageUrl())
                            .selectedLabel(answer.getSelectedLabel())
                            .selectedText(selectedText)
                            .correctLabel(correctLabel)
                            .correctText(correctText)
                            .isCorrect(answer.getIsCorrect())
                            .isAnswered(answer.getSelectedLabel() != null && !answer.getSelectedLabel().isBlank())
                            .explanation(question.getExplanation())
                            .transcriptText(question.getTranscriptText())
                            .options(optionResults)
                            .build();
                })
                .toList();

        return ToeicResultResponse.builder()
                .attemptId(attempt.getId())
                .examId(attempt.getExam().getId())
                .examCode(attempt.getExam().getExamCode())
                .examName(attempt.getExam().getExamName())
                .totalQuestions(attempt.getTotalQuestions())
                .answeredCount(answeredCount)
                .correctCount(attempt.getCorrectCount())
                .listeningCorrect(listeningCorrect)
                .readingCorrect(readingCorrect)
                .listeningScore(listeningScore)
                .readingScore(readingScore)
                .totalScore(totalScore)
                .submittedAt(attempt.getSubmittedAt())
                .partSummaries(partSummaries)
                .questionResults(questionResults)
                .build();
    }

    private boolean isListeningQuestion(ToeicQuestion question) {
        return question.getGroup() != null
                && question.getGroup().getPartNo() != null
                && question.getGroup().getPartNo() <= 4;
    }

    private boolean isImageMaterial(com.englishweb.be.entity.toeic.ToeicGroupMaterial material) {
        String type = material.getMaterialType();
        if (type == null) {
            return false;
        }

        String normalizedType = type.trim().toLowerCase();
        return normalizedType.contains("image")
                || normalizedType.contains("picture")
                || normalizedType.contains("photo");
    }

    private String normalizeLabel(String label) {
        if (label == null) {
            return null;
        }

        String value = label.trim().toUpperCase();

        return value.isBlank() ? null : value;
    }
}
