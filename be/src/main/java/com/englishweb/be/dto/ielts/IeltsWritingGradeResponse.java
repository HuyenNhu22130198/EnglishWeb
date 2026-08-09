package com.englishweb.be.dto.ielts;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IeltsWritingGradeResponse {
    private Integer userAnswerId;
    private String geminiStatus;
    private String geminiError;
    private String topicRelevance;
    private Boolean answersQuestion;
    private Integer taskResponsePercent;
    private Integer coherencePercent;
    private Integer vocabularyPercent;
    private Integer grammarPercent;
    private Integer overallQualityPercent;
    private String summary;
    private List<IeltsWritingTaskRequirement> taskRequirements;
    private List<String> strengths;
    private List<GeminiErrorItem> errors;
    private String correctedAnswerText;
}
