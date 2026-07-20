package com.englishweb.be.controller;

import com.englishweb.be.dto.ApiResponse;
import com.englishweb.be.dto.ielts.*;
import com.englishweb.be.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/ielts/speaking")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class IeltsSpeakingController {
    private final IeltsSpeakingService speakingService;
    private final AzureSpeechTokenService tokenService;

    @GetMapping("/speech-token")
    public ResponseEntity<ApiResponse<Map<String, String>>> getSpeechToken() {
        return ResponseEntity.ok(ApiResponse.success("Lấy Azure Speech token thành công", tokenService.issueToken()));
    }

    @PostMapping("/exams/{examId}/attempts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> startAttempt(@PathVariable Integer examId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("Đã bắt đầu lượt luyện Speaking", speakingService.startAttempt(examId, auth.getName())));
    }

    @GetMapping("/exams/{examId}/attempts/{attemptId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttempt(@PathVariable Integer examId, @PathVariable Integer attemptId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("Lấy lượt luyện Speaking thành công", speakingService.getAttempt(examId, attemptId, auth.getName())));
    }

    @PostMapping("/exams/{examId}/answers")
    public ResponseEntity<ApiResponse<IeltsSpeakingResultResponse.AnswerResult>> saveAnswer(
            @PathVariable Integer examId, @Valid @RequestBody IeltsSpeakingSaveRequest request, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("Đã lưu kết quả phát âm", speakingService.saveAnswer(examId, auth.getName(), request)));
    }

    @PostMapping("/exams/{examId}/attempts/{attemptId}/complete")
    public ResponseEntity<ApiResponse<IeltsSpeakingResultResponse>> complete(
            @PathVariable Integer examId, @PathVariable Integer attemptId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("Đã hoàn thành bài luyện Speaking", speakingService.completeAttempt(examId, attemptId, auth.getName())));
    }
}
