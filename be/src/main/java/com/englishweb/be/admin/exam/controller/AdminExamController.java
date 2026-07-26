package com.englishweb.be.admin.exam.controller;

import com.englishweb.be.admin.exam.dto.AdminExamDtos.*;
import com.englishweb.be.admin.exam.service.AdminExamService;
import com.englishweb.be.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/exams")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminExamController {
    private final AdminExamService service;

    @GetMapping("/{type}")
    public ResponseEntity<ApiResponse<PageResponse<ExamSummary>>> list(
            @PathVariable String type,
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đề thi thành công",
                service.list(type, keyword, status, sort, page, size)));
    }

    @GetMapping("/{type}/{id}")
    public ResponseEntity<ApiResponse<ExamDetail>> detail(@PathVariable String type, @PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết đề thi thành công", service.detail(type, id)));
    }

    @PutMapping("/{type}/{id}")
    public ResponseEntity<ApiResponse<ExamDetail>> updateExam(@PathVariable String type, @PathVariable Integer id,
                                                               @Valid @RequestBody ExamUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đề thi thành công", service.updateExam(type, id, request)));
    }

    @PatchMapping("/{type}/{id}/status")
    public ResponseEntity<ApiResponse<ExamSummary>> updateStatus(@PathVariable String type, @PathVariable Integer id,
                                                                  @Valid @RequestBody StatusUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái thành công", service.updateStatus(type, id, request)));
    }

    @PutMapping("/{type}/{examId}/{resource}/{recordId}")
    public ResponseEntity<ApiResponse<ExamDetail>> updateContent(@PathVariable String type,
            @PathVariable Integer examId, @PathVariable String resource, @PathVariable Integer recordId,
            @RequestBody ContentUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật nội dung thành công",
                service.updateContent(type, examId, resource, recordId, request)));
    }

    @DeleteMapping("/{type}/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String type, @PathVariable Integer id) {
        service.delete(type, id);
        return ResponseEntity.ok(ApiResponse.success("Xóa đề thi thành công", null));
    }
}
