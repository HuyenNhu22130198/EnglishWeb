package com.englishweb.be.dto.forum;

import com.englishweb.be.entity.forum.ForumReportStatus;
import com.englishweb.be.entity.forum.ForumReportTargetType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ForumReportResponse {
    private Integer id;
    private ForumReportTargetType targetType;
    private Integer postId;
    private String postTitle;
    private Integer commentId;
    private String commentContent;
    private ForumAuthorResponse reporter;
    private String reason;
    private ForumReportStatus status;
    private LocalDateTime createdAt;
}
