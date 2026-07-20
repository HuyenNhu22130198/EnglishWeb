package com.englishweb.be.dto.ielts;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class IeltsSpeakingSaveRequest {
    @NotNull private Integer attemptId;
    @NotNull private Integer sampleAnswerId;
    @Size(max = 10000) private String recognizedText;
    @Min(0) @Max(30) private Integer durationSeconds;
    @DecimalMin("0") @DecimalMax("100") private BigDecimal pronunciationScore;
    @DecimalMin("0") @DecimalMax("100") private BigDecimal accuracyScore;
    @DecimalMin("0") @DecimalMax("100") private BigDecimal fluencyScore;
    @DecimalMin("0") @DecimalMax("100") private BigDecimal completenessScore;
    @DecimalMin("0") @DecimalMax("100") private BigDecimal prosodyScore;
    @NotBlank @Size(max = 1000000) private String resultJson;
}
