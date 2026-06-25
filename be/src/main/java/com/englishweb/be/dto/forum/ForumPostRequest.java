package com.englishweb.be.dto.forum;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ForumPostRequest {

    @NotBlank(message = "Tieu de khong duoc de trong")
    @Size(max = 160, message = "Tieu de toi da 160 ky tu")
    private String title;

    @NotBlank(message = "Noi dung khong duoc de trong")
    @Size(max = 5000, message = "Noi dung toi da 5000 ky tu")
    private String content;
}
