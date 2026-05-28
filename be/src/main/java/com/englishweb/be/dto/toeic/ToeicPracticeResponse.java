package com.englishweb.be.dto.toeic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToeicPracticeResponse {

    private Integer examId;
    private String examCode;
    private String examName;
    private String listeningAudioUrl;
    private Integer totalQuestions;
    private List<GroupResponse> groups;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupResponse {
        private Integer groupId;
        private String section;
        private Integer partNo;
        private Integer groupNo;
        private String groupType;
        private String title;
        private String instructionText;
        private String sharedText;
        private List<MaterialResponse> materials;
        private List<QuestionResponse> questions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MaterialResponse {
        private Integer id;
        private String materialType;
        private String content;
        private String assetUrl;
        private Integer displayOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionResponse {
        private Integer questionId;
        private Integer questionNo;
        private String questionText;
        private String imageUrl;
        private Integer displayOrder;
        private List<OptionResponse> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionResponse {
        private Integer optionId;
        private String optionLabel;
        private String optionText;
        private Integer displayOrder;
    }
}