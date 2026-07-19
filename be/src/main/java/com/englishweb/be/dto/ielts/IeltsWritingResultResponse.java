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
public class IeltsWritingResultResponse {

    private Integer attemptId;
    private Integer examId;
    private String examCode;
    private String examName;
    private String skill;
    private Integer durationSeconds;
    private LocalDateTime submittedAt;
    private List<TaskResult> tasks;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskResult {
        private Integer taskId;
        private Integer taskNo;
        private String prompt;
        private String instruction;
        private String material;
        private String imageUrl;
        private String userAnswer;
        private Integer userWordCount;
        private String sampleAnswer;
        private Integer sampleAnswerId;
        private Integer matchedWordCount;
        private BigDecimal similarityPercent;
    }
}
