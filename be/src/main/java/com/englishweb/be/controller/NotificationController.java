package com.englishweb.be.controller;

import com.englishweb.be.dto.ApiResponse;
import com.englishweb.be.dto.NotificationResponse;
import com.englishweb.be.entity.User;
import com.englishweb.be.repository.UserRepository;
import com.englishweb.be.service.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications(
            Authentication authentication,
            @RequestParam(defaultValue = "20") int limit
    ) {
        Integer userId = currentUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success("OK", notificationService.getNotifications(userId, limit)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(Authentication authentication) {
        Integer userId = currentUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success("OK", Map.of("count", notificationService.countUnread(userId))));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<String>> markAsRead(Authentication authentication, @PathVariable Integer id) {
        Integer userId = currentUserId(authentication);
        notificationService.markAsRead(userId, id);
        return ResponseEntity.ok(ApiResponse.success("OK", null));
    }

    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<String>> markAllAsRead(Authentication authentication) {
        Integer userId = currentUserId(authentication);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success("OK", null));
    }

    private Integer currentUserId(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        return user.getId();
    }
}
