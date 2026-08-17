package com.englishweb.be.controller;

import com.englishweb.be.dto.ApiResponse;
import com.englishweb.be.dto.forum.ForumCommentRequest;
import com.englishweb.be.dto.forum.ForumCommentResponse;
import com.englishweb.be.dto.forum.ForumPageResponse;
import com.englishweb.be.dto.forum.ForumPostRequest;
import com.englishweb.be.dto.forum.ForumPostResponse;
import com.englishweb.be.dto.forum.ForumReportRequest;
import com.englishweb.be.service.ForumService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/forum")
@RequiredArgsConstructor
public class ForumController {

    private final ForumService forumService;

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<Object>> getCategories() {
        return ResponseEntity.ok(ApiResponse.success("OK", ForumService.CATEGORIES));
    }

    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<ForumPageResponse<ForumPostResponse>>> getPosts(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "NEWEST") String sort
    ) {
        String email = authentication == null ? null : authentication.getName();
        return ResponseEntity.ok(ApiResponse.success(
                "Lay danh sach bai viet thanh cong",
                forumService.getPosts(email, page, size, category, keyword, sort)
        ));
    }

    @GetMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<ForumPostResponse>> getPostDetail(
            Authentication authentication,
            @PathVariable Integer postId
    ) {
        String email = authentication == null ? null : authentication.getName();
        return ResponseEntity.ok(ApiResponse.success(
                "Lay chi tiet bai viet thanh cong",
                forumService.getPostDetail(email, postId)
        ));
    }

    @PostMapping("/posts")
    public ResponseEntity<ApiResponse<ForumPostResponse>> createPost(
            Authentication authentication,
            @Valid @RequestBody ForumPostRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Dang bai viet thanh cong",
                forumService.createPost(authentication.getName(), request)
        ));
    }

    @PutMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<ForumPostResponse>> updatePost(
            Authentication authentication,
            @PathVariable Integer postId,
            @Valid @RequestBody ForumPostRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cap nhat bai viet thanh cong",
                forumService.updatePost(authentication.getName(), postId, request)
        ));
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<ApiResponse<String>> deletePost(
            Authentication authentication,
            @PathVariable Integer postId
    ) {
        forumService.deletePost(authentication.getName(), postId);
        return ResponseEntity.ok(ApiResponse.success("Xoa bai viet thanh cong", null));
    }

    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<ApiResponse<ForumPostResponse>> toggleLike(
            Authentication authentication,
            @PathVariable Integer postId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cap nhat luot thich thanh cong",
                forumService.toggleLike(authentication.getName(), postId)
        ));
    }

    @PostMapping("/posts/{postId}/save")
    public ResponseEntity<ApiResponse<ForumPostResponse>> toggleSave(
            Authentication authentication,
            @PathVariable Integer postId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cap nhat luu bai viet thanh cong",
                forumService.toggleSavePost(authentication.getName(), postId)
        ));
    }

    @GetMapping("/saved-posts")
    public ResponseEntity<ApiResponse<ForumPageResponse<ForumPostResponse>>> getSavedPosts(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Lay danh sach bai viet da luu thanh cong",
                forumService.getSavedPosts(authentication.getName(), page, size)
        ));
    }

    @PostMapping("/posts/{postId}/report")
    public ResponseEntity<ApiResponse<String>> reportPost(
            Authentication authentication,
            @PathVariable Integer postId,
            @Valid @RequestBody ForumReportRequest request
    ) {
        forumService.reportPost(authentication.getName(), postId, request.getReason());
        return ResponseEntity.ok(ApiResponse.success("Da gui bao cao. Cam on ban da phan anh.", null));
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<ForumCommentResponse>> addComment(
            Authentication authentication,
            @PathVariable Integer postId,
            @Valid @RequestBody ForumCommentRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Binh luan thanh cong",
                forumService.addComment(authentication.getName(), postId, request)
        ));
    }

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<ForumCommentResponse>> updateComment(
            Authentication authentication,
            @PathVariable Integer commentId,
            @Valid @RequestBody ForumCommentRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cap nhat binh luan thanh cong",
                forumService.updateComment(authentication.getName(), commentId, request)
        ));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<String>> deleteComment(
            Authentication authentication,
            @PathVariable Integer commentId
    ) {
        forumService.deleteComment(authentication.getName(), commentId);
        return ResponseEntity.ok(ApiResponse.success("Xoa binh luan thanh cong", null));
    }

    @PostMapping("/comments/{commentId}/like")
    public ResponseEntity<ApiResponse<ForumCommentResponse>> toggleCommentLike(
            Authentication authentication,
            @PathVariable Integer commentId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cap nhat luot thich binh luan thanh cong",
                forumService.toggleCommentLike(authentication.getName(), commentId)
        ));
    }

    @PostMapping("/comments/{commentId}/report")
    public ResponseEntity<ApiResponse<String>> reportComment(
            Authentication authentication,
            @PathVariable Integer commentId,
            @Valid @RequestBody ForumReportRequest request
    ) {
        forumService.reportComment(authentication.getName(), commentId, request.getReason());
        return ResponseEntity.ok(ApiResponse.success("Da gui bao cao. Cam on ban da phan anh.", null));
    }
}
