package com.englishweb.be.service;

import com.englishweb.be.dto.AccountActionRequest;
import com.englishweb.be.dto.ChangePasswordRequest;
import com.englishweb.be.dto.UpdateAccountSettingsRequest;
import com.englishweb.be.dto.UpdateProfileRequest;
import com.englishweb.be.dto.UpdateRoleRequest;
import com.englishweb.be.entity.Role;
import com.englishweb.be.entity.User;
import com.englishweb.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User updateProfile(String email, UpdateProfileRequest request) {
        User user = getUserByEmail(email);

        if (request.getUsername() != null && !request.getUsername().isBlank()
                && !request.getUsername().equals(user.getUsername())
                && userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username đã được sử dụng!");
        }

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            user.setUsername(request.getUsername().trim());
        }

        user.setPhoneNumber(normalizeBlank(request.getPhoneNumber()));
        user.setBirthDate(request.getBirthDate());
        user.setGender(normalizeBlank(request.getGender()));
        user.setLearningGoal(normalizeBlank(request.getLearningGoal()));
        applyTargetScore(user, request);
        user.setCurrentLevel(normalizeBlank(request.getCurrentLevel()));
        user.setUpdatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    public User updateAccountSettings(String email, UpdateAccountSettingsRequest request) {
        User user = getUserByEmail(email);

        user.setPublicProfileVisible(Boolean.TRUE.equals(request.getPublicProfileVisible()));
        user.setNotifyForumReplies(Boolean.TRUE.equals(request.getNotifyForumReplies()));
        user.setNotifyForumMentions(Boolean.TRUE.equals(request.getNotifyForumMentions()));
        user.setNotifySystemUpdates(Boolean.TRUE.equals(request.getNotifySystemUpdates()));
        user.setUpdatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    public void changePassword(String email, ChangePasswordRequest request) {
        User user = getUserByEmail(email);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không chính xác!");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu mới và xác nhận mật khẩu không khớp!");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu mới phải khác mật khẩu hiện tại!");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    public void deleteOwnAccount(String email, AccountActionRequest request) {
        User user = getUserByEmail(email);
        validateCurrentPassword(user, request.getCurrentPassword());

        String deletedSuffix = user.getId() + "_" + System.currentTimeMillis();

        user.setStatus("DELETED");
        user.setEmail("deleted_" + deletedSuffix + "@deleted.local");
        user.setUsername("deleted_" + deletedSuffix);
        user.setFullName("Tài khoản đã xóa");
        user.setPhoneNumber(null);
        user.setBirthDate(null);
        user.setGender(null);
        user.setLearningGoal(null);
        user.setTargetExamType(null);
        user.setTargetScore(null);
        user.setTargetBandScore(null);
        user.setCurrentLevel(null);
        user.setPublicProfileVisible(false);
        user.setNotifyForumReplies(false);
        user.setNotifyForumMentions(false);
        user.setNotifySystemUpdates(false);
        user.setPassword(passwordEncoder.encode("deleted_" + deletedSuffix));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    public User updateUserRole(UpdateRoleRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại!"));

        Role role = Role.valueOf(request.getRole().toUpperCase());
        user.setRole(role);
        user.setUpdatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    public User disableUser(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại!"));

        user.setStatus("INACTIVE");
        user.setUpdatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    public User enableUser(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại!"));

        user.setStatus("ACTIVE");
        user.setUpdatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại!"));
    }

    private void validateCurrentPassword(User user, String currentPassword) {
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không chính xác!");
        }
    }

    private String normalizeBlank(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private void applyTargetScore(User user, UpdateProfileRequest request) {
        String targetExamType = normalizeBlank(request.getTargetExamType());

        if (targetExamType == null) {
            user.setTargetExamType(null);
            user.setTargetScore(null);
            user.setTargetBandScore(null);
            return;
        }

        String normalizedExamType = targetExamType.toUpperCase();

        if (!"TOEIC".equals(normalizedExamType) && !"IELTS".equals(normalizedExamType)) {
            throw new RuntimeException("Loại mục tiêu không hợp lệ!");
        }

        user.setTargetExamType(normalizedExamType);

        if ("IELTS".equals(normalizedExamType)) {
            BigDecimal bandScore = request.getTargetBandScore();
            if (bandScore != null && bandScore.remainder(new BigDecimal("0.5")).compareTo(BigDecimal.ZERO) != 0) {
                throw new RuntimeException("Band IELTS phải theo bước 0.5!");
            }

            user.setTargetScore(null);
            user.setTargetBandScore(bandScore);
            return;
        }

        user.setTargetScore(request.getTargetScore());
        user.setTargetBandScore(null);
    }
}
