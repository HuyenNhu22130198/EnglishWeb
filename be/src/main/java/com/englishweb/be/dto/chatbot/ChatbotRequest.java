package com.englishweb.be.dto.chatbot;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatbotRequest {

    @NotBlank(message = "Vui lòng nhập câu hỏi cần tra cứu")
    private String message;

    /** Ngữ cảnh đề đang làm (tùy chọn) để tra nhanh theo số câu. */
    private String examType;
    private Integer examId;
    private Integer partNo;
    private String skill;
}
