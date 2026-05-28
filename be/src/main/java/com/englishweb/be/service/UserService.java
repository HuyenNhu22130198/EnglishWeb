package com.englishweb.be.service;

import com.englishweb.be.dto.UpdateRoleRequest;
import com.englishweb.be.entity.Role;
import com.englishweb.be.entity.User;
import com.englishweb.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public List<User> getAllUsers() {
        return userRepository.findAll();
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
}
