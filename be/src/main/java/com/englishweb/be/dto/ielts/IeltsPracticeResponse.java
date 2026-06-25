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
public class IeltsPracticeResponse {

    private Integer examId;
    private String examCode;
    private String examName;
    private String skill;
    private Integer totalQuestions;
    private List<AssetResponse> assets;
    private List<GroupResponse> groups;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssetResponse {
        private Integer id;
        private Integer partNo;
        private String assetType;
        private String assetUrl;
        private Integer displayOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupResponse {
        private Integer groupId;
        private Integer partNo;
        private Integer groupNo;
        private String title;
        private String instructionText;
        private String sharedText;
        private AssetResponse mainAsset;
        private List<BlockResponse> blocks;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BlockResponse {
        private Integer blockId;
        private Integer blockNo;
        private String questionType;
        private String instructionText;
        private Integer maxAnswers;
        private String answerFormat;
        private Integer displayOrder;
        private List<QuestionResponse> questions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionResponse {
        private Integer questionId;
        private Integer questionNo;
        private String promptText;
        private Integer displayOrder;
        private List<OptionResponse> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionResponse {
        private Integer optionId;
        private String optionKey;
        private String optionText;
        private Integer displayOrder;
    }
}
