package com.englishweb.be.dto.chatbot;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatbotRequest {

    @NotBlank(message = "Vui lòng nhập câu hỏi cần tra cứu")
    private String message;
}
