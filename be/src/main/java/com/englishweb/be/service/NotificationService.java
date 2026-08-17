package com.englishweb.be.service;

import com.englishweb.be.dto.NotificationResponse;
import com.englishweb.be.entity.Notification;
import com.englishweb.be.entity.User;
import com.englishweb.be.repository.NotificationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public void notify(User recipient, String type, String message, String link) {
        notificationRepository.save(Notification.builder()
                .recipient(recipient)
                .type(type)
                .message(message)
                .link(link)
                .build());
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(Integer userId, int limit) {
        Pageable pageable = PageRequest.of(0, Math.max(1, Math.min(limit, 50)));
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countUnread(Integer userId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Integer userId, Integer notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new EntityNotFoundException("Notification not found"));
        if (!notification.getRecipient().getId().equals(userId)) {
            throw new IllegalArgumentException("You can only update your own notifications");
        }
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(Integer userId) {
        Pageable pageable = PageRequest.of(0, 200);
        notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable)
                .stream()
                .filter(n -> !Boolean.TRUE.equals(n.getIsRead()))
                .forEach(n -> n.setIsRead(true));
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .message(notification.getMessage())
                .link(notification.getLink())
                .read(Boolean.TRUE.equals(notification.getIsRead()))
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
