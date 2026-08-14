package com.englishweb.be.controller;

import com.englishweb.be.dto.ApiResponse;
import com.englishweb.be.dto.forum.ForumCommentRequest;
import com.englishweb.be.dto.forum.ForumCommentResponse;
import com.englishweb.be.dto.forum.ForumPostRequest;
import com.englishweb.be.dto.forum.ForumPostResponse;
import com.englishweb.be.service.ForumService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/forum")
@RequiredArgsConstructor
public class ForumController {

    private final ForumService forumService;

    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<List<ForumPostResponse>>> getPosts(Authentication authentication) {
        String email = authentication == null ? null : authentication.getName();
        return ResponseEntity.ok(ApiResponse.success("Lay danh sach bai viet thanh cong", forumService.getPosts(email)));
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
}
