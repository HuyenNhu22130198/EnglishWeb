package com.englishweb.be.dto.toeic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToeicExamListResponse {

    private Integer id;

    private String examCode;

    private String title;

    private String description;

    private Integer year;

    private Integer questions;

    private Integer duration;

    private String parts;

    private Integer score;

    private String status;

    private Long attempts;

    private String listeningAudioUrl;
}