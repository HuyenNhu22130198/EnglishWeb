package com.englishweb.be.controller;

import com.englishweb.be.dto.ApiResponse;
import com.englishweb.be.dto.chatbot.ChatbotRequest;
import com.englishweb.be.dto.chatbot.ChatbotResponse;
import com.englishweb.be.service.ChatbotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/ask")
    public ResponseEntity<ApiResponse<ChatbotResponse>> ask(@Valid @RequestBody ChatbotRequest request) {
        ChatbotResponse response = chatbotService.ask(request);
        return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
    }
}
