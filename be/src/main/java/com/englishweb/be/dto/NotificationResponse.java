package com.englishweb.be.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Integer id;
    private String type;
    private String message;
    private String link;
    private boolean read;
    private LocalDateTime createdAt;
}
