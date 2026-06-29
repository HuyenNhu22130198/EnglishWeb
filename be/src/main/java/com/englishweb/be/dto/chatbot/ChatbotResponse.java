package com.englishweb.be.dto.chatbot;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ChatbotResponse {

    private boolean found;
    private String message;
    private String examType;
    private Integer examId;
    private String examCode;
    private String examName;
    private Integer questionId;
    private Integer questionNo;
    private Integer partNo;
    private String skill;
    private String questionText;
    private String sharedText;
    private String answer;
    private String answerText;
    private String explanation;
    private String transcriptText;
    private Double matchScore;
    private List<OptionResponse> options;

    @Data
    @Builder
    public static class OptionResponse {
        private String label;
        private String text;
        private boolean correct;
    }
}
