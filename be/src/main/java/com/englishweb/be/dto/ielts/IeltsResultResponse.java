package com.englishweb.be.dto.ielts;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IeltsResultResponse {

    private Integer attemptId;
    private Integer examId;
    private String examCode;
    private String examName;
    private String skill;
    private Integer totalQuestions;
    private Integer answeredCount;
    private Integer correctCount;
    private BigDecimal bandScore;
    private LocalDateTime submittedAt;
    private List<PartSummary> partSummaries;
    private List<QuestionResult> questionResults;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PartSummary {
        private Integer partNo;
        private Integer totalQuestions;
        private Integer answeredCount;
        private Integer correctCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionResult {
        private Integer questionId;
        private Integer questionNo;
        private Integer partNo;
        private Integer groupId;
        private String groupTitle;
        private Integer blockId;
        private String blockType;
        private String sharedText;
        private String promptText;
        private String selectedOptionKey;
        private String selectedAnswerText;
        private Boolean isCorrect;
        private Boolean isAnswered;
        private String explanationText;
        private List<OptionResult> options;
        private List<CorrectAnswer> correctAnswers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionResult {
        private String optionKey;
        private String optionText;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CorrectAnswer {
        private String answerKey;
        private String answerText;
    }
}
