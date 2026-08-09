package com.englishweb.be.service;

import com.englishweb.be.config.JwtProvider;
import com.englishweb.be.dto.LoginRequest;
import com.englishweb.be.dto.LoginResponse;
import com.englishweb.be.dto.OAuthLoginRequest;
import com.englishweb.be.dto.RegisterRequest;
import com.englishweb.be.dto.ResetPasswordRequest;
import com.englishweb.be.entity.EmailVerificationToken;
import com.englishweb.be.entity.PasswordResetToken;
import com.englishweb.be.entity.Role;
import com.englishweb.be.entity.User;
import com.englishweb.be.repository.EmailVerificationTokenRepository;
import com.englishweb.be.repository.PasswordResetTokenRepository;
import com.englishweb.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final EmailService emailService;
    private final OAuthVerificationService oauthVerificationService;

    @Value("${app.token.verify-ttl-minutes:1440}")
    private long verificationTokenTtlMinutes;

    @Value("${app.token.reset-ttl-minutes:30}")
    private long passwordResetTokenTtlMinutes;

    @Transactional
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
                .provider("LOCAL")
                .build();

        userRepository.save(user);
        trySendVerificationEmail(user);
        return "Đăng ký thành công!";
    }

    public LoginResponse login(LoginRequest request) {
        // Tìm user theo email hoặc username
        User user = userRepository.findByEmail(request.getEmailOrUsername())
                .orElseGet(() -> userRepository.findByUsername(request.getEmailOrUsername())
                        .orElseThrow(() -> new RuntimeException("Email hoặc username không tồn tại!")));

        if ("DELETED".equals(user.getStatus())) {
            throw new RuntimeException("Tài khoản này đã bị xóa và không thể đăng nhập lại!");
        }

        // Kiểm tra mật khẩu
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Email/username hoặc mật khẩu không chính xác!");
        }

        if (isLocalProvider(user) && !Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new RuntimeException("EMAIL_NOT_VERIFIED: Vui lòng xác thực email trước khi đăng nhập.");
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

    @Transactional
    public String verifyEmail(String tokenValue) {
        EmailVerificationToken token = emailVerificationTokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new RuntimeException("Link xác thực email không hợp lệ."));
        validateToken(token.isUsed(), token.getExpiresAt(), "Link xác thực email");

        User user = token.getUser();
        user.setEmailVerified(true);
        token.setUsed(true);
        userRepository.save(user);
        emailVerificationTokenRepository.save(token);
        return "Xác thực email thành công! Bạn có thể đăng nhập.";
    }

    @Transactional
    public String resendVerification(String email) {
        userRepository.findByEmail(email.trim()).ifPresent(user -> {
            if (isLocalProvider(user) && !Boolean.TRUE.equals(user.getEmailVerified())) {
                trySendVerificationEmail(user);
            }
        });
        return "Nếu tài khoản cần xác thực, email hướng dẫn đã được gửi.";
    }

    @Transactional
    public String forgotPassword(String email) {
        userRepository.findByEmail(email.trim()).ifPresent(user -> {
            if (isLocalProvider(user) && !"DELETED".equals(user.getStatus())) {
                passwordResetTokenRepository.findAllByUserAndUsedFalse(user)
                        .forEach(token -> token.setUsed(true));
                PasswordResetToken token = PasswordResetToken.builder()
                        .token(UUID.randomUUID().toString())
                        .user(user)
                        .expiresAt(LocalDateTime.now().plusMinutes(passwordResetTokenTtlMinutes))
                        .build();
                passwordResetTokenRepository.save(token);
                try {
                    emailService.sendPasswordResetEmail(user, token.getToken());
                } catch (RuntimeException exception) {
                    log.error("Không thể gửi email đặt lại mật khẩu cho user id={}", user.getId(), exception);
                }
            }
        });
        return "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.";
    }

    @Transactional
    public String resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = passwordResetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Link đặt lại mật khẩu không hợp lệ."));
        validateToken(token.isUsed(), token.getExpiresAt(), "Link đặt lại mật khẩu");

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu không khớp!");
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        token.setUsed(true);
        userRepository.save(user);
        passwordResetTokenRepository.save(token);
        return "Đặt lại mật khẩu thành công!";
    }

    @Transactional
    public LoginResponse oauthLogin(String provider, OAuthLoginRequest request) {
        String normalizedProvider = provider.toUpperCase(Locale.ROOT);
        OAuthVerificationService.OAuthProfile profile =
                oauthVerificationService.verify(normalizedProvider, request.getCredential());

        User user = userRepository
                .findByProviderAndProviderId(profile.provider(), profile.providerId())
                .orElseGet(() -> userRepository.findByEmail(profile.email())
                        .orElseGet(() -> createSocialUser(profile)));

        if ("DELETED".equals(user.getStatus())) {
            throw new RuntimeException("Tài khoản này đã bị xóa và không thể đăng nhập lại!");
        }

        boolean changed = false;
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            user.setEmailVerified(true);
            changed = true;
        }
        if (normalizedProvider.equals(user.getProvider()) && user.getProviderId() == null) {
            user.setProviderId(profile.providerId());
            changed = true;
        }
        if (changed) {
            userRepository.save(user);
        }

        return buildLoginResponse(user);
    }

    private User createSocialUser(OAuthVerificationService.OAuthProfile profile) {
        return userRepository.save(User.builder()
                .email(profile.email())
                .username(generateUniqueUsername(profile.email()))
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .fullName(profile.name())
                .role(Role.USER)
                .status("ACTIVE")
                .emailVerified(true)
                .provider(profile.provider())
                .providerId(profile.providerId())
                .build());
    }

    private String generateUniqueUsername(String email) {
        int atIndex = email.indexOf('@');
        String emailPrefix = (atIndex > 0 ? email.substring(0, atIndex) : email)
                .replaceAll("[^A-Za-z0-9._-]", "")
                .toLowerCase(Locale.ROOT);
        String base = emailPrefix.isBlank() ? "user" : emailPrefix;
        base = base.substring(0, Math.min(base.length(), 40));
        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = base + suffix++;
        }
        return candidate;
    }

    private void sendVerificationEmail(User user) {
        emailVerificationTokenRepository.findAllByUserAndUsedFalse(user)
                .forEach(token -> token.setUsed(true));
        EmailVerificationToken token = EmailVerificationToken.builder()
                .token(UUID.randomUUID().toString())
                .user(user)
                .expiresAt(LocalDateTime.now().plusMinutes(verificationTokenTtlMinutes))
                .build();
        emailVerificationTokenRepository.save(token);
        emailService.sendVerificationEmail(user, token.getToken());
    }

    private void trySendVerificationEmail(User user) {
        try {
            sendVerificationEmail(user);
        } catch (RuntimeException exception) {
            log.error("Không thể gửi email xác thực cho user id={}", user.getId(), exception);
        }
    }

    private void validateToken(boolean used, LocalDateTime expiresAt, String tokenName) {
        if (used) {
            throw new RuntimeException(tokenName + " đã được sử dụng.");
        }
        if (expiresAt.isBefore(LocalDateTime.now())) {
            throw new RuntimeException(tokenName + " đã hết hạn.");
        }
    }

    private boolean isLocalProvider(User user) {
        return user.getProvider() == null || "LOCAL".equalsIgnoreCase(user.getProvider());
    }

    private LoginResponse buildLoginResponse(User user) {
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
