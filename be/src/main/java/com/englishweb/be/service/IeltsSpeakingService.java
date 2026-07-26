package com.englishweb.be.service;

import com.englishweb.be.dto.ielts.*;
import com.englishweb.be.entity.User;
import com.englishweb.be.entity.ielts.*;
import com.englishweb.be.repository.UserRepository;
import com.englishweb.be.repository.ielts.*;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.*;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IeltsSpeakingService {
    private static final String SPEAKING = "SPEAKING";
    private final UserRepository userRepository;
    private final IeltsExamRepository examRepository;
    private final IeltsAttemptRepository attemptRepository;
    private final IeltsSpeakingTaskRepository taskRepository;
    private final IeltsSpeakingSampleAnswerRepository sampleRepository;
    private final IeltsSpeakingItemRepository itemRepository;
    private final IeltsSpeakingUserAnswerRepository answerRepository;
    private final JsonMapper objectMapper = JsonMapper.builder().build();

    @Transactional
    public Map<String, Object> startAttempt(Integer examId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng."));
        IeltsExam exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề IELTS."));
        if ("hidden".equalsIgnoreCase(exam.getStatus())) {
            throw new RuntimeException("Đề IELTS này hiện không được công khai.");
        }
        if (taskRepository.findByExam_IdOrderByPartNoAscDisplayOrderAscIdAsc(examId).isEmpty()) {
            throw new RuntimeException("Đề này chưa có nội dung IELTS Speaking.");
        }
        LocalDateTime now = LocalDateTime.now();
        IeltsAttempt attempt = attemptRepository.save(IeltsAttempt.builder()
                .user(user).exam(exam).attemptType("SKILL_PRACTICE").skill(SPEAKING)
                .status("IN_PROGRESS").startedAt(now).build());
        return attemptState(attempt);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAttempt(Integer examId, Integer attemptId, String email) {
        return attemptState(requireAttempt(examId, attemptId, email, false));
    }

    @Transactional
    public IeltsSpeakingResultResponse.AnswerResult saveAnswer(
            Integer examId, String email, IeltsSpeakingSaveRequest request
    ) {
        IeltsAttempt attempt = requireAttempt(examId, request.getAttemptId(), email, true);
        IeltsSpeakingSampleAnswer sample = sampleRepository.findById(request.getSampleAnswerId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy câu trả lời mẫu."));
        if (!Objects.equals(sample.getSpeakingTask().getExam().getId(), examId)) {
            throw new RuntimeException("Câu trả lời mẫu không thuộc đề đang luyện.");
        }
        JsonNode submittedResult = validateJson(request.getResultJson());
        boolean browserAssessment = "BROWSER".equalsIgnoreCase(submittedResult.path("assessmentSource").asText());
        if (browserAssessment && trimToNull(request.getRecognizedText()) == null) {
            throw new RuntimeException("Trình duyệt chưa nhận diện được lời đọc để so khớp.");
        }
        String storedResultJson = browserAssessment
                ? buildBrowserResult(sample.getAnswerText(), request.getRecognizedText())
                : markAzureResult(submittedResult);
        LocalDateTime now = LocalDateTime.now();
        IeltsSpeakingUserAnswer answer = answerRepository
                .findByAttempt_IdAndSampleAnswer_Id(attempt.getId(), sample.getId())
                .orElseGet(IeltsSpeakingUserAnswer::new);
        answer.setAttempt(attempt);
        answer.setSpeakingTask(sample.getSpeakingTask());
        answer.setSpeakingItem(resolveSpeakingItem(sample));
        answer.setSampleAnswer(sample);
        answer.setReferenceText(sample.getAnswerText().trim());
        answer.setAnswerText(trimToNull(request.getRecognizedText()));
        answer.setAudioUrl(null);
        answer.setDurationSeconds(request.getDurationSeconds());
        answer.setBandScore(null);
        answer.setFeedbackText(null);
        answer.setPronunciationScore(browserAssessment ? null : request.getPronunciationScore());
        answer.setAccuracyScore(browserAssessment ? null : request.getAccuracyScore());
        answer.setFluencyScore(browserAssessment ? null : request.getFluencyScore());
        answer.setCompletenessScore(browserAssessment ? null : request.getCompletenessScore());
        answer.setProsodyScore(browserAssessment ? null : request.getProsodyScore());
        answer.setResultJson(storedResultJson);
        answer.setSubmittedAt(now);
        return toAnswerResult(answerRepository.save(answer));
    }

    @Transactional
    public IeltsSpeakingResultResponse completeAttempt(Integer examId, Integer attemptId, String email) {
        IeltsAttempt attempt = requireAttempt(examId, attemptId, email, true);
        if (answerRepository.countByAttempt_Id(attemptId) == 0) {
            throw new RuntimeException("Bạn cần luyện ít nhất một câu mẫu trước khi hoàn thành.");
        }
        attempt.setStatus("SUBMITTED");
        attempt.setSubmittedAt(LocalDateTime.now());
        attempt.setUpdatedAt(LocalDateTime.now());
        attemptRepository.save(attempt);
        return buildResult(attempt);
    }

    @Transactional(readOnly = true)
    public boolean isSpeakingAttempt(Integer attemptId, String email) {
        return attemptRepository.findByIdAndUser_Email(attemptId, email)
                .map(a -> SPEAKING.equalsIgnoreCase(a.getSkill())).orElse(false);
    }

    @Transactional(readOnly = true)
    public IeltsSpeakingResultResponse getResult(Integer attemptId, String email) {
        IeltsAttempt attempt = attemptRepository.findByIdAndUser_Email(attemptId, email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kết quả Speaking hoặc bạn không có quyền xem."));
        if (!SPEAKING.equalsIgnoreCase(attempt.getSkill()) || !"SUBMITTED".equalsIgnoreCase(attempt.getStatus())) {
            throw new RuntimeException("Bài luyện Speaking này chưa được hoàn thành.");
        }
        return buildResult(attempt);
    }

    @Transactional(readOnly = true)
    public List<IeltsAttemptHistoryResponse> getHistory(String email) {
        List<IeltsAttempt> attempts = attemptRepository.findSubmittedSpeakingAttemptsByUserEmail(email);
        Map<Integer, List<IeltsAttempt>> byExam = attempts.stream().collect(Collectors.groupingBy(a -> a.getExam().getId()));
        Map<Integer, BigDecimal> bestByExam = new HashMap<>();
        Map<Integer, BigDecimal> bestReadingByExam = new HashMap<>();
        for (var entry : byExam.entrySet()) {
            BigDecimal best = entry.getValue().stream().map(a -> average(answerRepository.findResultAnswers(a.getId()), ScoreType.PRONUNCIATION))
                    .max(BigDecimal::compareTo).orElse(BigDecimal.ZERO.setScale(2));
            bestByExam.put(entry.getKey(), best);
            BigDecimal bestReading = entry.getValue().stream()
                    .map(a -> averageReadingMatch(answerRepository.findResultAnswers(a.getId())))
                    .filter(Objects::nonNull).max(BigDecimal::compareTo).orElse(null);
            bestReadingByExam.put(entry.getKey(), bestReading);
        }
        return attempts.stream().map(attempt -> {
            List<IeltsSpeakingUserAnswer> answers = answerRepository.findResultAnswers(attempt.getId());
            int total = totalSamples(attempt.getExam().getId());
            return IeltsAttemptHistoryResponse.builder()
                    .attemptId(attempt.getId()).examId(attempt.getExam().getId())
                    .examCode(attempt.getExam().getExamCode()).examName(attempt.getExam().getExamName())
                    .skill(SPEAKING).durationSeconds(duration(attempt)).submittedAt(attempt.getSubmittedAt())
                    .averagePronunciationScore(average(answers, ScoreType.PRONUNCIATION))
                    .bestPronunciationScore(bestByExam.get(attempt.getExam().getId()))
                    .averageReadingMatchScore(averageReadingMatch(answers))
                    .bestReadingMatchScore(bestReadingByExam.get(attempt.getExam().getId()))
                    .assessmentSource(assessmentSource(answers))
                    .practicedSampleCount(answers.size()).totalSampleCount(total).build();
        }).toList();
    }

    private IeltsSpeakingResultResponse buildResult(IeltsAttempt attempt) {
        List<IeltsSpeakingUserAnswer> answers = answerRepository.findResultAnswers(attempt.getId());
        return IeltsSpeakingResultResponse.builder()
                .attemptId(attempt.getId()).examId(attempt.getExam().getId())
                .examCode(attempt.getExam().getExamCode()).examName(attempt.getExam().getExamName())
                .skill(SPEAKING).submittedAt(attempt.getSubmittedAt())
                .practicedCount(answers.size()).totalSamples(totalSamples(attempt.getExam().getId()))
                .averagePronunciationScore(average(answers, ScoreType.PRONUNCIATION))
                .averageAccuracyScore(average(answers, ScoreType.ACCURACY))
                .averageFluencyScore(average(answers, ScoreType.FLUENCY))
                .averageCompletenessScore(average(answers, ScoreType.COMPLETENESS))
                .averageReadingMatchScore(averageReadingMatch(answers))
                .assessmentSource(assessmentSource(answers))
                .answers(answers.stream().map(this::toAnswerResult).toList()).build();
    }

    private IeltsSpeakingResultResponse.AnswerResult toAnswerResult(IeltsSpeakingUserAnswer answer) {
        IeltsSpeakingTask task = answer.getSpeakingTask();
        return IeltsSpeakingResultResponse.AnswerResult.builder()
                .sampleAnswerId(answer.getSampleAnswer().getId()).partNo(task.getPartNo())
                .topicTitle(task.getTopicTitle()).instruction(task.getInstructionText())
                .question(Objects.equals(task.getPartNo(), 2) || answer.getSpeakingItem() == null
                        ? task.getTopicTitle() : answer.getSpeakingItem().getContentText())
                .segmentTitle(answer.getSampleAnswer().getSegmentTitle())
                .referenceText(answer.getReferenceText()).recognizedText(answer.getAnswerText())
                .durationSeconds(answer.getDurationSeconds()).pronunciationScore(answer.getPronunciationScore())
                .accuracyScore(answer.getAccuracyScore()).fluencyScore(answer.getFluencyScore())
                .completenessScore(answer.getCompletenessScore()).prosodyScore(answer.getProsodyScore())
                .resultJson(answer.getResultJson()).build();
    }

    private IeltsAttempt requireAttempt(Integer examId, Integer attemptId, String email, boolean mustBeActive) {
        IeltsAttempt attempt = attemptRepository.findByIdAndUser_Email(attemptId, email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lượt luyện hoặc bạn không có quyền truy cập."));
        if (!SPEAKING.equalsIgnoreCase(attempt.getSkill()) || !Objects.equals(examId, attempt.getExam().getId())) {
            throw new RuntimeException("Lượt luyện không thuộc đề IELTS Speaking này.");
        }
        if (mustBeActive && !"IN_PROGRESS".equalsIgnoreCase(attempt.getStatus())) {
            throw new RuntimeException("Lượt luyện này đã hoàn thành. Hãy tạo lượt luyện mới.");
        }
        return attempt;
    }

    private Map<String, Object> attemptState(IeltsAttempt attempt) {
        List<Integer> practiced = answerRepository.findResultAnswers(attempt.getId()).stream()
                .map(a -> a.getSampleAnswer().getId()).toList();
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("attemptId", attempt.getId()); state.put("examId", attempt.getExam().getId());
        state.put("status", attempt.getStatus()); state.put("practicedSampleIds", practiced);
        return state;
    }

    private int totalSamples(Integer examId) {
        return taskRepository.findByExam_IdOrderByPartNoAscDisplayOrderAscIdAsc(examId).stream()
                .mapToInt(t -> sampleRepository.findBySpeakingTask_IdOrderByDisplayOrderAscIdAsc(t.getId()).size()).sum();
    }

    private IeltsSpeakingItem resolveSpeakingItem(IeltsSpeakingSampleAnswer sample) {
        if (sample.getSpeakingItem() != null) return sample.getSpeakingItem();
        int expectedOrder = (sample.getDisplayOrder() == null ? 0 : sample.getDisplayOrder()) + 1;
        return itemRepository.findBySpeakingTask_IdOrderByDisplayOrderAscIdAsc(sample.getSpeakingTask().getId())
                .stream().filter(item -> Objects.equals(item.getDisplayOrder(), expectedOrder)).findFirst().orElse(null);
    }

    private BigDecimal average(List<IeltsSpeakingUserAnswer> answers, ScoreType type) {
        List<BigDecimal> values = answers.stream().map(a -> switch (type) {
            case PRONUNCIATION -> a.getPronunciationScore(); case ACCURACY -> a.getAccuracyScore();
            case FLUENCY -> a.getFluencyScore(); case COMPLETENESS -> a.getCompletenessScore();
        }).filter(Objects::nonNull).toList();
        if (values.isEmpty()) return BigDecimal.ZERO.setScale(2);
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    private int duration(IeltsAttempt attempt) {
        if (attempt.getStartedAt() == null || attempt.getSubmittedAt() == null) return 0;
        return Math.toIntExact(Math.max(0, Duration.between(attempt.getStartedAt(), attempt.getSubmittedAt()).getSeconds()));
    }
    private void validateJsonSyntax(String json) {
        try { objectMapper.readTree(json); } catch (Exception e) { throw new RuntimeException("Chi tiết đánh giá phát âm không hợp lệ."); }
    }
    private JsonNode validateJson(String json) {
        validateJsonSyntax(json);
        return objectMapper.readTree(json);
    }

    @SuppressWarnings("unchecked")
    private String markAzureResult(JsonNode submittedResult) {
        Map<String, Object> result = objectMapper.convertValue(submittedResult, Map.class);
        result.put("assessmentSource", "AZURE");
        return objectMapper.writeValueAsString(result);
    }

    private String buildBrowserResult(String referenceText, String recognizedText) {
        List<String> reference = tokenize(referenceText);
        List<String> recognized = tokenize(recognizedText);
        int[][] lengths = new int[reference.size() + 1][recognized.size() + 1];
        for (int i = 1; i <= reference.size(); i++) {
            for (int j = 1; j <= recognized.size(); j++) {
                lengths[i][j] = reference.get(i - 1).equals(recognized.get(j - 1))
                        ? lengths[i - 1][j - 1] + 1
                        : Math.max(lengths[i - 1][j], lengths[i][j - 1]);
            }
        }
        List<Map<String, String>> reversed = new ArrayList<>();
        int i = reference.size(), j = recognized.size();
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && reference.get(i - 1).equals(recognized.get(j - 1))) {
                reversed.add(Map.of("word", reference.get(i - 1), "status", "MATCHED")); i--; j--;
            } else if (j > 0 && (i == 0 || lengths[i][j - 1] >= lengths[i - 1][j])) {
                reversed.add(Map.of("word", recognized.get(j - 1), "status", "EXTRA")); j--;
            } else {
                reversed.add(Map.of("word", reference.get(i - 1), "status", "MISSING")); i--;
            }
        }
        Collections.reverse(reversed);
        int matched = lengths[reference.size()][recognized.size()];
        int denominator = reference.size() + recognized.size();
        BigDecimal score = denominator == 0 ? BigDecimal.ZERO.setScale(2)
                : BigDecimal.valueOf(200L * matched).divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
        if (score.compareTo(BigDecimal.ZERO) < 0 || score.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new RuntimeException("Độ khớp khi đọc phải nằm trong khoảng 0–100.");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("assessmentSource", "BROWSER");
        result.put("readingMatchScore", score);
        result.put("matchedWordCount", matched);
        result.put("missingWordCount", reference.size() - matched);
        result.put("extraWordCount", recognized.size() - matched);
        result.put("referenceWordCount", reference.size());
        result.put("recognizedWordCount", recognized.size());
        result.put("recognizedText", trimToNull(recognizedText));
        result.put("wordResults", reversed);
        return objectMapper.writeValueAsString(result);
    }

    private List<String> tokenize(String value) {
        if (value == null) return List.of();
        String normalized = value.toLowerCase(Locale.ENGLISH)
                .replaceAll("[^\\p{L}\\p{N}\\s]", "")
                .trim().replaceAll("\\s+", " ");
        return normalized.isEmpty() ? List.of() : Arrays.asList(normalized.split(" "));
    }

    private BigDecimal averageReadingMatch(List<IeltsSpeakingUserAnswer> answers) {
        List<BigDecimal> values = answers.stream().map(this::readingMatchScore).filter(Objects::nonNull).toList();
        if (values.isEmpty()) return null;
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal readingMatchScore(IeltsSpeakingUserAnswer answer) {
        try {
            JsonNode json = objectMapper.readTree(answer.getResultJson());
            return "BROWSER".equalsIgnoreCase(json.path("assessmentSource").asText())
                    ? json.path("readingMatchScore").decimalValue() : null;
        } catch (Exception ignored) { return null; }
    }

    private String assessmentSource(List<IeltsSpeakingUserAnswer> answers) {
        boolean browser = answers.stream().anyMatch(answer -> readingMatchScore(answer) != null);
        boolean azure = answers.stream().anyMatch(answer -> answer.getPronunciationScore() != null);
        return browser && azure ? "MIXED" : browser ? "BROWSER" : "AZURE";
    }

    private String trimToNull(String value) { return value == null || value.trim().isEmpty() ? null : value.trim(); }
    private enum ScoreType { PRONUNCIATION, ACCURACY, FLUENCY, COMPLETENESS }
}
