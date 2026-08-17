package com.englishweb.be.dto.forum;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ForumReportRequest {

    @NotBlank(message = "Vui long nhap ly do bao cao")
    @Size(max = 300, message = "Ly do toi da 300 ky tu")
    private String reason;
}
