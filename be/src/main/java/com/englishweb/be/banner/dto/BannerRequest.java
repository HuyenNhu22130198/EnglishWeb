package com.englishweb.be.banner.dto;

import lombok.Data;

@Data
public class BannerRequest {
    private String imageUrl;
    private String title;
    private String linkUrl;
    private Integer displayOrder;
    private Boolean active;
}