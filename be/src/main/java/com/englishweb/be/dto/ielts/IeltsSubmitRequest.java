package com.englishweb.be.dto.ielts;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IeltsSubmitRequest {

    private List<AnswerRequest> answers;
    private List<WritingAnswerRequest> tasks;
    private Integer elapsedSeconds;

    public IeltsSubmitRequest(List<AnswerRequest> answers) {
        this.answers = answers;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerRequest {
        private Integer questionId;
        private String selectedOptionKey;
        private String answerText;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WritingAnswerRequest {
        private Integer taskId;
        private Integer taskNo;
        private String answerText;
    }
}
