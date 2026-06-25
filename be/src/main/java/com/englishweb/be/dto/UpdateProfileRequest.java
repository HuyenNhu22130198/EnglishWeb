package com.englishweb.be.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProfileRequest {

    @Size(min = 2, max = 120, message = "Ho ten phai tu 2 den 120 ky tu")
    private String fullName;

    @Size(min = 3, max = 50, message = "Username phai tu 3 den 50 ky tu")
    private String username;

    @Size(max = 20, message = "So dien thoai khong duoc vuot qua 20 ky tu")
    private String phoneNumber;

    private LocalDate birthDate;

    @Size(max = 20, message = "Gioi tinh khong duoc vuot qua 20 ky tu")
    private String gender;

    @Size(max = 120, message = "Muc tieu hoc tap khong duoc vuot qua 120 ky tu")
    private String learningGoal;

    @Size(max = 10, message = "Loai muc tieu khong hop le")
    private String targetExamType;

    @Min(value = 10, message = "Diem muc tieu TOEIC toi thieu la 10")
    @Max(value = 990, message = "Diem muc tieu TOEIC toi da la 990")
    private Integer targetScore;

    @DecimalMin(value = "0.0", message = "Band IELTS toi thieu la 0.0")
    @DecimalMax(value = "9.0", message = "Band IELTS toi da la 9.0")
    private BigDecimal targetBandScore;

    @Size(max = 50, message = "Trinh do hien tai khong duoc vuot qua 50 ky tu")
    private String currentLevel;
}
