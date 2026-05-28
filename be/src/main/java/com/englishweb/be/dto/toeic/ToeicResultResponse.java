package com.englishweb.be.dto.toeic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToeicResultResponse {

    private Integer attemptId;
    private Integer examId;
    private String examCode;
    private String examName;

    private Integer totalQuestions;
    private Integer answeredCount;
    private Integer correctCount;

    private Integer listeningCorrect;
    private Integer readingCorrect;

    private Integer listeningScore;
    private Integer readingScore;
    private Integer totalScore;

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
        private String groupTitle;
        private String sharedText;
        private String questionText;
        private String selectedLabel;
        private String selectedText;
        private String correctLabel;
        private String correctText;
        private Boolean isCorrect;
        private Boolean isAnswered;
        private String explanation;
        private String transcriptText;
        private List<OptionResult> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionResult {
        private String optionLabel;
        private String optionText;
    }
}
