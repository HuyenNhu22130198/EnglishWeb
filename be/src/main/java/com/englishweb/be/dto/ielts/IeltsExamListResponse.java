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
public class IeltsExamListResponse {

    private Integer id;
    private String examCode;
    private String title;
    private String description;
    private String status;
    private Integer totalQuestions;
    private Integer listeningQuestions;
    private Integer readingQuestions;
    private Long attempts;
    private List<String> availableSkills;
}
