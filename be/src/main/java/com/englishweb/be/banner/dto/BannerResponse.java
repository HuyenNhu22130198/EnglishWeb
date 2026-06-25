package com.englishweb.be.banner.dto;

import com.englishweb.be.entity.Banner;

import java.time.LocalDateTime;

public record BannerResponse(
        Long id,
        String imageUrl,
        String title,
        String linkUrl,
        Integer displayOrder,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static BannerResponse fromEntity(Banner banner) {
        return new BannerResponse(
                banner.getId(),
                banner.getImageUrl(),
                banner.getTitle(),
                banner.getLinkUrl(),
                banner.getDisplayOrder(),
                banner.getActive(),
                banner.getCreatedAt(),
                banner.getUpdatedAt()
        );
    }
}