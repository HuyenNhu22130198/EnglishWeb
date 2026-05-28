package com.englishweb.be.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {

    private Integer id;
    private String email;
    private String fullName;
    private String role;
    private String token;
    private String message;
}
