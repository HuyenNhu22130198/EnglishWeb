package com.englishweb.be.service;

import com.englishweb.be.entity.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public void sendVerificationEmail(User user, String token) {
        String url = buildFrontendUrl("/verify-email", token);
        String body = """
                <h2>Xác thực email StudyEnglishWithNhu</h2>
                <p>Xin chào %s,</p>
                <p>Vui lòng nhấn vào liên kết dưới đây để xác thực tài khoản:</p>
                <p><a href="%s">Xác thực email</a></p>
                <p>Nếu bạn không tạo tài khoản này, hãy bỏ qua email.</p>
                """.formatted(HtmlUtils.htmlEscape(user.getFullName()), HtmlUtils.htmlEscape(url));
        sendHtml(user.getEmail(), "Xác thực email StudyEnglishWithNhu", body);
    }

    public void sendPasswordResetEmail(User user, String token) {
        String url = buildFrontendUrl("/reset-password", token);
        String body = """
                <h2>Đặt lại mật khẩu StudyEnglishWithNhu</h2>
                <p>Xin chào %s,</p>
                <p>Nhấn vào liên kết dưới đây để đặt lại mật khẩu:</p>
                <p><a href="%s">Đặt lại mật khẩu</a></p>
                <p>Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>
                """.formatted(HtmlUtils.htmlEscape(user.getFullName()), HtmlUtils.htmlEscape(url));
        sendHtml(user.getEmail(), "Đặt lại mật khẩu StudyEnglishWithNhu", body);
    }

    private String buildFrontendUrl(String path, String token) {
        return UriComponentsBuilder.fromUriString(frontendUrl)
                .path(path)
                .queryParam("token", token)
                .build()
                .encode()
                .toUriString();
    }

    private void sendHtml(String recipient, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );
            if (fromEmail != null && !fromEmail.isBlank()) {
                helper.setFrom(fromEmail);
            }
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(body, true);
            mailSender.send(message);
        } catch (MessagingException exception) {
            throw new RuntimeException("Không thể gửi email. Vui lòng thử lại sau.", exception);
        }
    }
}
