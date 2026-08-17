package com.englishweb.be.admin.forum;

import com.englishweb.be.dto.ApiResponse;
import com.englishweb.be.dto.forum.ForumPageResponse;
import com.englishweb.be.dto.forum.ForumPostResponse;
import com.englishweb.be.dto.forum.ForumReportResponse;
import com.englishweb.be.service.ForumService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/forum")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminForumController {

    private final ForumService forumService;

    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<ForumPageResponse<ForumPostResponse>>> getPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "NEWEST") String sort
    ) {
        return ResponseEntity.ok(ApiResponse.success("OK", forumService.adminGetPosts(page, size, category, keyword, sort)));
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<String>> deletePost(@PathVariable Integer postId) {
        forumService.adminDeletePost(postId);
        return ResponseEntity.ok(ApiResponse.success("Da xoa bai viet", null));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<String>> deleteComment(@PathVariable Integer commentId) {
        forumService.adminDeleteComment(commentId);
        return ResponseEntity.ok(ApiResponse.success("Da xoa binh luan", null));
    }

    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<ForumPageResponse<ForumReportResponse>>> getReports(
            @RequestParam(required = false, defaultValue = "PENDING") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success("OK", forumService.adminGetReports(status, page, size)));
    }

    @PostMapping("/reports/{reportId}/resolve")
    public ResponseEntity<ApiResponse<String>> resolveReport(
            @PathVariable Integer reportId,
            @RequestParam(defaultValue = "false") boolean deleteTarget
    ) {
        forumService.adminResolveReport(reportId, deleteTarget);
        return ResponseEntity.ok(ApiResponse.success("Da xu ly bao cao", null));
    }

    @PostMapping("/reports/{reportId}/dismiss")
    public ResponseEntity<ApiResponse<String>> dismissReport(@PathVariable Integer reportId) {
        forumService.adminDismissReport(reportId);
        return ResponseEntity.ok(ApiResponse.success("Da bo qua bao cao", null));
    }
}
