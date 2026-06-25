package com.englishweb.be.dto.forum;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ForumAuthorResponse {
    private Integer id;
    private String username;
    private String fullName;
    private String initial;
}
