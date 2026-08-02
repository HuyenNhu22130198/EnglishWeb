package com.englishweb.be.service;

import com.englishweb.be.dto.ielts.*;
import com.englishweb.be.entity.ielts.*;
import com.englishweb.be.repository.ielts.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class IeltsSpeakingFreeService {
    private static final String SPEAKING = "SPEAKING";

    private final IeltsAttemptRepository attemptRepository;
    private final IeltsSpeakingItemRepository itemRepository;
    private final IeltsSpeakingSampleAnswerRepository sampleRepository;
    private final IeltsSpeakingFreeAnswerRepository freeAnswerRepository;
    private final AudioStorageService audioStorageService;
    private final WhisperTranscriptionService whisperService;
    private final GeminiGradingService geminiService;
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Transactional
    public IeltsSpeakingFreeTranscribeResponse transcribeAnswer(
            Integer examId,
            Integer attemptId,
            String userEmail,
            Integer speakingItemId,
            Integer sampleAnswerId,
            MultipartFile audioFile,
            Integer durationSeconds
    ) {
        IeltsAttempt attempt = requireAttempt(examId, attemptId, userEmail, true);
        IeltsSpeakingItem item = itemRepository.findById(speakingItemId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy câu hỏi Speaking."));
        IeltsSpeakingTask task = item.getSpeakingTask();
        if (!Objects.equals(task.getExam().getId(), examId)) {
            throw new RuntimeException("Câu hỏi Speaking không thuộc đề đang luyện.");
        }
        if (durationSeconds != null && durationSeconds < 0) {
            throw new RuntimeException("Thời lượng ghi âm không hợp lệ.");
        }
        IeltsSpeakingSampleAnswer sample = resolveSample(sampleAnswerId, task, item);

        byte[] audioBytes;
        try {
            audioBytes = audioFile == null ? null : audioFile.getBytes();
        } catch (Exception exception) {
            throw new RuntimeException("Không thể đọc file audio đã gửi.", exception);
        }

        // Cloudinary upload is a hard failure: no entity is persisted before it succeeds.
        AudioStorageService.UploadResult uploaded = audioStorageService.upload(audioFile);
        WhisperTranscriptionService.TranscriptionResult whisper =
                whisperService.transcribe(audioBytes, audioFile.getOriginalFilename());

        String question = buildQuestionText(task, item);
        LocalDateTime now = LocalDateTime.now();

        // Re-recording the same question within the same attempt must overwrite the
        // existing row rather than insert a new one: (attempt_id, speaking_item_id) is unique.
        IeltsSpeakingFreeAnswer answer = freeAnswerRepository
                .findByAttempt_IdAndSpeakingItem_Id(attemptId, speakingItemId)
                .orElseGet(() -> IeltsSpeakingFreeAnswer.builder()
                        .attempt(attempt)
                        .speakingTask(task)
                        .speakingItem(item)
                        .build());

        answer.setSampleAnswer(sample);
        answer.setQuestionText(question);
        answer.setAudioUrl(uploaded.secureUrl());
        answer.setAudioPublicId(uploaded.publicId());
        answer.setDurationSeconds(durationSeconds);
        answer.setWhisperTranscriptText(whisper.transcript());
        answer.setTranscriptText(whisper.transcript());
        answer.setWhisperStatus(whisper.status());
        answer.setWhisperError(whisper.error());
        answer.setStatus("TRANSCRIBED");
        answer.setTranscribedAt(now);

        // A new recording invalidates any previous Gemini grade for the old audio/transcript.
        answer.setGeminiStatus(null);
        answer.setGeminiError(null);
        answer.setRelevanceScore(null);
        answer.setIdeaDevelopmentScore(null);
        answer.setGrammarScore(null);
        answer.setVocabularyScore(null);
        answer.setCoherenceScore(null);
        answer.setOverallBandEstimate(null);
        answer.setErrorsJson(null);
        answer.setCorrectedAnswerText(null);
        answer.setGeminiRawJson(null);
        answer.setSubmittedAt(null);

        answer = freeAnswerRepository.save(answer);

        return IeltsSpeakingFreeTranscribeResponse.builder()
                .freeAnswerId(answer.getId())
                .audioUrl(answer.getAudioUrl())
                .transcriptText(answer.getTranscriptText())
                .whisperStatus(answer.getWhisperStatus())
                .whisperError(answer.getWhisperError())
                .question(answer.getQuestionText())
                .partNo(task.getPartNo())
                .topicTitle(task.getTopicTitle())
                .instruction(task.getInstructionText())
                .build();
    }

    @Transactional
    public IeltsSpeakingFreeGradeResponse submitAnswer(
            Integer freeAnswerId, String userEmail, String editedTranscriptText
    ) {
        IeltsSpeakingFreeAnswer answer = freeAnswerRepository.findById(freeAnswerId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy câu trả lời Speaking tự do."));
        if (!Objects.equals(answer.getAttempt().getUser().getEmail(), userEmail)) {
            throw new RuntimeException("Bạn không có quyền nộp câu trả lời này.");
        }

        String transcript = trimToNull(editedTranscriptText);
        if (transcript == null) {
            throw new RuntimeException("Vui lòng nhập transcript trước khi nộp bài.");
        }
        answer.setTranscriptText(transcript);

        GeminiGradingService.GradingResult grade =
                geminiService.grade(answer.getQuestionText(), transcript);
        answer.setGeminiStatus(grade.status());
        answer.setGeminiError(grade.error());
        answer.setRelevanceScore(grade.relevanceScore());
        answer.setIdeaDevelopmentScore(grade.ideaDevelopmentScore());
        answer.setGrammarScore(grade.grammarScore());
        answer.setVocabularyScore(grade.vocabularyScore());
        answer.setCoherenceScore(grade.coherenceScore());
        answer.setOverallBandEstimate(grade.overallBandEstimate());
        answer.setErrorsJson(writeErrors(grade.errors()));
        answer.setCorrectedAnswerText(grade.correctedAnswer());
        answer.setGeminiRawJson(grade.rawJson());
        answer.setStatus("GRADED");
        answer.setSubmittedAt(LocalDateTime.now());
        answer = freeAnswerRepository.save(answer);
        return toGradeResponse(answer);
    }

    private IeltsSpeakingSampleAnswer resolveSample(
            Integer sampleAnswerId, IeltsSpeakingTask task, IeltsSpeakingItem item
    ) {
        if (sampleAnswerId == null) return null;
        IeltsSpeakingSampleAnswer sample = sampleRepository.findById(sampleAnswerId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy câu trả lời mẫu."));
        if (!Objects.equals(sample.getSpeakingTask().getId(), task.getId())) {
            throw new RuntimeException("Câu trả lời mẫu không thuộc phần Speaking đang luyện.");
        }
        if (sample.getSpeakingItem() != null
                && !Objects.equals(sample.getSpeakingItem().getId(), item.getId())) {
            throw new RuntimeException("Câu trả lời mẫu không khớp với câu hỏi Speaking.");
        }
        return sample;
    }

    private String buildQuestionText(IeltsSpeakingTask task, IeltsSpeakingItem selectedItem) {
        if (!Objects.equals(task.getPartNo(), 2)) {
            return selectedItem.getContentText();
        }
        StringBuilder cueCard = new StringBuilder();
        if (task.getTopicTitle() != null && !task.getTopicTitle().isBlank()) {
            cueCard.append(task.getTopicTitle().trim());
        }
        for (IeltsSpeakingItem item :
                itemRepository.findBySpeakingTask_IdOrderByDisplayOrderAscIdAsc(task.getId())) {
            if (!cueCard.isEmpty()) cueCard.append('\n');
            cueCard.append("- ").append(item.getContentText().trim());
        }
        return cueCard.isEmpty() ? selectedItem.getContentText() : cueCard.toString();
    }

    private IeltsAttempt requireAttempt(
            Integer examId, Integer attemptId, String email, boolean mustBeActive
    ) {
        IeltsAttempt attempt = attemptRepository.findByIdAndUser_Email(attemptId, email)
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy lượt luyện hoặc bạn không có quyền truy cập."));
        if (!SPEAKING.equalsIgnoreCase(attempt.getSkill())
                || !Objects.equals(examId, attempt.getExam().getId())) {
            throw new RuntimeException("Lượt luyện không thuộc đề IELTS Speaking này.");
        }
        if (mustBeActive && !"IN_PROGRESS".equalsIgnoreCase(attempt.getStatus())) {
            throw new RuntimeException("Lượt luyện này đã hoàn thành. Hãy tạo lượt luyện mới.");
        }
        return attempt;
    }

    private IeltsSpeakingFreeGradeResponse toGradeResponse(IeltsSpeakingFreeAnswer answer) {
        IeltsSpeakingSampleAnswer sample = answer.getSampleAnswer();
        return IeltsSpeakingFreeGradeResponse.builder()
                .freeAnswerId(answer.getId())
                .audioUrl(answer.getAudioUrl())
                .durationSeconds(answer.getDurationSeconds())
                .transcriptText(answer.getTranscriptText())
                .relevanceScore(answer.getRelevanceScore())
                .ideaDevelopmentScore(answer.getIdeaDevelopmentScore())
                .grammarScore(answer.getGrammarScore())
                .vocabularyScore(answer.getVocabularyScore())
                .coherenceScore(answer.getCoherenceScore())
                .overallBandEstimate(answer.getOverallBandEstimate())
                .geminiStatus(answer.getGeminiStatus())
                .geminiError(answer.getGeminiError())
                .errors(readErrors(answer.getErrorsJson()))
                .correctedAnswerText(answer.getCorrectedAnswerText())
                .sampleAnswerText(sample == null ? null : sample.getAnswerText())
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

    private String trimToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }
}
