package com.englishweb.be.dto.forum;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.time.LocalDateTime;

@Data
@Builder
public class ForumCommentResponse {
    private Integer id;
    private String content;
    private ForumAuthorResponse author;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer parentCommentId;
    private long likeCount;
    private boolean likedByCurrentUser;
    private List<ForumCommentResponse> replies;
}
