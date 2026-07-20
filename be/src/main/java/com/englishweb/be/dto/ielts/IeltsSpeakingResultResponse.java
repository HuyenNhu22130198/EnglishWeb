package com.englishweb.be.dto.ielts;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class IeltsSpeakingResultResponse {
    private Integer attemptId;
    private Integer examId;
    private String examCode;
    private String examName;
    private String skill;
    private LocalDateTime submittedAt;
    private Integer practicedCount;
    private Integer totalSamples;
    private BigDecimal averagePronunciationScore;
    private BigDecimal averageAccuracyScore;
    private BigDecimal averageFluencyScore;
    private BigDecimal averageCompletenessScore;
    private BigDecimal averageReadingMatchScore;
    private String assessmentSource;
    private List<AnswerResult> answers;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AnswerResult {
        private Integer sampleAnswerId;
        private Integer partNo;
        private String topicTitle;
        private String instruction;
        private String question;
        private String segmentTitle;
        private String referenceText;
        private String recognizedText;
        private Integer durationSeconds;
        private BigDecimal pronunciationScore;
        private BigDecimal accuracyScore;
        private BigDecimal fluencyScore;
        private BigDecimal completenessScore;
        private BigDecimal prosodyScore;
        private String resultJson;
    }
}
