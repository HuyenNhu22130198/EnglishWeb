package com.englishweb.be.dto.ielts;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IeltsSpeakingFreeSubmitRequest {
    @NotBlank(message = "Vui lòng nhập transcript trước khi nộp bài.")
    private String transcriptText;
}
