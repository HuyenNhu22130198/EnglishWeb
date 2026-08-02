package com.englishweb.be.controller;

import com.englishweb.be.dto.ApiResponse;
import com.englishweb.be.dto.ielts.IeltsExamListResponse;
import com.englishweb.be.dto.ielts.IeltsPracticeResponse;
import com.englishweb.be.dto.ielts.IeltsSubmitRequest;
import com.englishweb.be.dto.ielts.IeltsWritingGradeResponse;
import com.englishweb.be.service.IeltsExamService;
import com.englishweb.be.service.IeltsPracticeService;
import com.englishweb.be.service.IeltsSubmitService;
import com.englishweb.be.service.IeltsWritingService;
import com.englishweb.be.service.IeltsSpeakingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ielts/exams")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class IeltsExamController {

    private final IeltsExamService ieltsExamService;
    private final IeltsPracticeService ieltsPracticeService;
    private final IeltsSubmitService ieltsSubmitService;
    private final IeltsWritingService ieltsWritingService;
    private final IeltsSpeakingService ieltsSpeakingService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<IeltsExamListResponse>>> getIeltsExams(
            @RequestParam(required = false) String keyword
    ) {
        return ResponseEntity.ok(
                ApiResponse.success("Lấy danh sách đề IELTS thành công", ieltsExamService.getIeltsExams(keyword))
        );
    }

    @GetMapping("/{examId}/practice")
    public ResponseEntity<ApiResponse<IeltsPracticeResponse>> getPracticeExam(
            @PathVariable Integer examId,
            @RequestParam String skill
    ) {
        return ResponseEntity.ok(
                ApiResponse.success("Lấy nội dung đề IELTS thành công", ieltsPracticeService.getPracticeExam(examId, skill))
        );
    }

    @PostMapping("/{examId}/submit")
    public ResponseEntity<ApiResponse<Object>> submitExam(
            @PathVariable Integer examId,
            @RequestParam String skill,
            @RequestBody IeltsSubmitRequest request,
            Authentication authentication
    ) {
        Object result = "WRITING".equalsIgnoreCase(skill)
                ? ieltsWritingService.submit(examId, authentication.getName(), request)
                : ieltsSubmitService.submitExam(examId, authentication.getName(), skill, request);
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Nộp bài IELTS thành công",
                        result
                )
        );
    }

    @PostMapping("/writing/answers/{userAnswerId}/grade")
    public ResponseEntity<ApiResponse<IeltsWritingGradeResponse>> gradeWritingAnswer(
            @PathVariable Integer userAnswerId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Chấm bài Writing bằng AI thành công",
                        ieltsWritingService.gradeAnswer(userAnswerId, authentication.getName())
                )
        );
    }

    @GetMapping("/results/{attemptId}")
    public ResponseEntity<ApiResponse<Object>> getResult(
            @PathVariable Integer attemptId,
            Authentication authentication
    ) {
        Object result = ieltsSpeakingService.isSpeakingAttempt(attemptId, authentication.getName())
                ? ieltsSpeakingService.getResult(attemptId, authentication.getName())
                : ieltsWritingService.isWritingAttempt(attemptId, authentication.getName())
                    ? ieltsWritingService.getResult(attemptId, authentication.getName())
                    : ieltsSubmitService.getResult(attemptId, authentication.getName());
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Lấy kết quả bài thi IELTS thành công",
                        result
                )
        );
    }
}
