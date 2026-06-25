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
public class AccountActionRequest {

    @NotBlank(message = "Mật khẩu hiện tại không được để trống")
    private String currentPassword;
}
