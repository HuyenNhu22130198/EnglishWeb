package com.englishweb.be.service;

import com.englishweb.be.config.JwtProvider;
import com.englishweb.be.dto.LoginRequest;
import com.englishweb.be.dto.LoginResponse;
import com.englishweb.be.dto.RegisterRequest;
import com.englishweb.be.entity.Role;
import com.englishweb.be.entity.User;
import com.englishweb.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    public String register(RegisterRequest request) {
        // Kiểm tra email đã tồn tại
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã được sử dụng!");
        }

        // Kiểm tra username đã tồn tại
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username đã được sử dụng!");
        }

        // Kiểm tra mật khẩu khớp
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu không khớp!");
        }

        // Tạo User mới
        User user = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(Role.USER) // Mặc định là USER
                .status("ACTIVE")
                .emailVerified(false)
                .build();

        userRepository.save(user);
        return "Đăng ký thành công!";
    }

    public LoginResponse login(LoginRequest request) {
        // Tìm user theo email hoặc username
        User user = userRepository.findByEmail(request.getEmailOrUsername())
                .orElseGet(() -> userRepository.findByUsername(request.getEmailOrUsername())
                        .orElseThrow(() -> new RuntimeException("Email hoặc username không tồn tại!")));

        // Kiểm tra trạng thái active
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new RuntimeException("Tài khoản này đã bị khóa!");
        }

        // Kiểm tra mật khẩu
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Email/username hoặc mật khẩu không chính xác!");
        }

        // Tạo token
        String token = jwtProvider.generateToken(user.getEmail());

        return LoginResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .token(token)
                .message("Đăng nhập thành công!")
                .build();
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại!"));
    }

    public User getUserById(Integer id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại!"));
    }
}
