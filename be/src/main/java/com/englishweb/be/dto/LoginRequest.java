package com.englishweb.be.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginRequest {

    @NotBlank(message = "Email hoặc username không được để trống")
    private String emailOrUsername;

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
}
