package com.englishweb.be.dto.ielts;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IeltsAttemptHistoryResponse {

    private Integer attemptId;
    private Integer examId;
    private String examCode;
    private String examName;
    private String skill;
    private BigDecimal bandScore;
    private Integer correctCount;
    private Integer answeredCount;
    private Integer totalQuestions;
    private Integer durationSeconds;
    private LocalDateTime submittedAt;
    private Integer totalWordCount;
    private Integer task1WordCount;
    private Integer task2WordCount;
    private Integer task1OverallQualityPercent;
    private Integer task2OverallQualityPercent;
    private BigDecimal averagePronunciationScore;
    private BigDecimal bestPronunciationScore;
    private BigDecimal averageReadingMatchScore;
    private BigDecimal bestReadingMatchScore;
    private String assessmentSource;
    private Integer practicedSampleCount;
    private Integer totalSampleCount;
}
