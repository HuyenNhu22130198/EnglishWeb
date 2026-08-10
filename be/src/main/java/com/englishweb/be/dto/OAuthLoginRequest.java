package com.englishweb.be.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OAuthLoginRequest {

    @NotBlank(message = "Thông tin xác thực không được để trống")
    private String credential;
}
