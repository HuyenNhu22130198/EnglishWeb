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
public class ToeicAttemptHistoryResponse {

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
    private String status;
    private List<ToeicResultResponse.PartSummary> partSummaries;
}
