package com.englishweb.be.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRoleRequest {

    @NotNull(message = "User ID không được để trống")
    private Integer userId;

    @NotNull(message = "Role không được để trống")
    private String role;
}
