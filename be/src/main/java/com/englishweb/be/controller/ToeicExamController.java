package com.englishweb.be.controller;

import com.englishweb.be.dto.ApiResponse;
import com.englishweb.be.dto.toeic.ToeicExamListResponse;
import com.englishweb.be.dto.toeic.ToeicPracticeResponse;
import com.englishweb.be.dto.toeic.ToeicResultResponse;
import com.englishweb.be.dto.toeic.ToeicSubmitRequest;
import com.englishweb.be.service.ToeicExamService;
import com.englishweb.be.service.ToeicPracticeService;
import com.englishweb.be.service.ToeicSubmitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/toeic/exams")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class ToeicExamController {

    private final ToeicExamService toeicExamService;
    private final ToeicPracticeService toeicPracticeService;
    private final ToeicSubmitService toeicSubmitService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ToeicExamListResponse>>> getToeicExams(
            @RequestParam(required = false) String keyword
    ) {
        List<ToeicExamListResponse> exams = toeicExamService.getToeicExams(keyword);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách đề TOEIC thành công", exams)
        );
    }

    @GetMapping("/{examId}/practice")
    public ResponseEntity<ApiResponse<ToeicPracticeResponse>> getPracticeExam(
            @PathVariable Integer examId,
            @RequestParam(required = false) List<Integer> parts
    ) {
        ToeicPracticeResponse exam = toeicPracticeService.getPracticeExam(examId, parts);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy nội dung đề TOEIC thành công", exam)
        );
    }

    @PostMapping("/{examId}/submit")
    public ResponseEntity<ApiResponse<ToeicResultResponse>> submitExam(
            @PathVariable Integer examId,
            @RequestParam(required = false) List<Integer> parts,
            @RequestBody ToeicSubmitRequest request,
            Authentication authentication
    ) {
        String userEmail = authentication.getName();

        ToeicResultResponse result = toeicSubmitService.submitExam(
                examId,
                userEmail,
                parts,
                request
        );

        return ResponseEntity.ok(
                ApiResponse.success("Nộp bài thành công", result)
        );
    }

    @GetMapping("/results/{attemptId}")
    public ResponseEntity<ApiResponse<ToeicResultResponse>> getResult(
            @PathVariable Integer attemptId,
            Authentication authentication
    ) {
        String userEmail = authentication.getName();

        ToeicResultResponse result = toeicSubmitService.getResult(attemptId, userEmail);

        return ResponseEntity.ok(
                ApiResponse.success("Lấy kết quả bài thi thành công", result)
        );
    }
}
