package com.englishweb.be.dto.forum;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ForumPostResponse {
    private Integer id;
    private String title;
    private String content;
    private String category;
    private ForumAuthorResponse author;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long likeCount;
    private long commentCount;
    private boolean likedByCurrentUser;
    private boolean savedByCurrentUser;
    @Builder.Default
    private long reportCount = 0;
    private List<ForumCommentResponse> comments;
}
