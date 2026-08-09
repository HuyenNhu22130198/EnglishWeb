package com.englishweb.be.dto.ielts;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IeltsSpeakingFreeGradeResponse {
    private Integer freeAnswerId;
    private String audioUrl;
    private Integer durationSeconds;
    private String transcriptText;
    private BigDecimal relevanceScore;
    private BigDecimal ideaDevelopmentScore;
    private BigDecimal grammarScore;
    private BigDecimal vocabularyScore;
    private BigDecimal coherenceScore;
    private BigDecimal overallBandEstimate;
    private String geminiStatus;
    private String geminiError;
    private List<GeminiErrorItem> errors;
    private String correctedAnswerText;
    private String sampleAnswerText;
}
