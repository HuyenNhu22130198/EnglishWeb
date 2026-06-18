package com.englishweb.be.dto.forum;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForumCommentRequest {

    @NotBlank(message = "Binh luan khong duoc de trong")
    private String content;

    private Integer parentCommentId;
}
