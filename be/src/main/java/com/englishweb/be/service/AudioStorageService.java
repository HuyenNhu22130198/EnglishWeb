package com.englishweb.be.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@Service
public class AudioStorageService {
    private static final long MAX_AUDIO_BYTES = 20L * 1024 * 1024;

    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;

    public AudioStorageService(
            @Value("${cloudinary.cloud-name:}") String cloudName,
            @Value("${cloudinary.api-key:}") String apiKey,
            @Value("${cloudinary.api-secret:}") String apiSecret
    ) {
        this.cloudName = normalize(cloudName);
        this.apiKey = normalize(apiKey);
        this.apiSecret = normalize(apiSecret);
    }

    public UploadResult upload(MultipartFile audio) {
        validate(audio);
        if (cloudName.isBlank() || apiKey.isBlank() || apiSecret.isBlank()) {
            throw new RuntimeException("Cloudinary chưa được cấu hình để lưu audio Speaking.");
        }
        try {
            Cloudinary cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName, "api_key", apiKey, "api_secret", apiSecret, "secure", true
            ));
            // Cloudinary xử lý audio qua pipeline "video" vì không có resource_type riêng cho audio.
            Map<?, ?> result = cloudinary.uploader().upload(audio.getBytes(), ObjectUtils.asMap(
                    "resource_type", "video",
                    "folder", "ielts-speaking-free",
                    "public_id", "answer-" + UUID.randomUUID()
            ));
            Object secureUrl = result.get("secure_url");
            Object publicId = result.get("public_id");
            if (secureUrl == null || publicId == null) {
                throw new RuntimeException("Cloudinary không trả về đủ URL và public ID của audio.");
            }
            return new UploadResult(secureUrl.toString(), publicId.toString());
        } catch (RuntimeException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new RuntimeException("Không thể tải audio Speaking lên Cloudinary: " + safeMessage(exception), exception);
        }
    }

    private void validate(MultipartFile audio) {
        if (audio == null || audio.isEmpty()) {
            throw new RuntimeException("Vui lòng ghi âm câu trả lời trước khi gửi.");
        }
        String contentType = normalize(audio.getContentType()).toLowerCase();
        if (!contentType.startsWith("audio/")) {
            throw new RuntimeException("File tải lên phải có định dạng audio.");
        }
        if (audio.getSize() > MAX_AUDIO_BYTES) {
            throw new RuntimeException("File audio vượt quá giới hạn 20 MB.");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String safeMessage(Exception exception) {
        return exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
    }

    public record UploadResult(String secureUrl, String publicId) {}
}
