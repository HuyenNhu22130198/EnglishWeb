package com.englishweb.be.admin.exam.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.englishweb.be.admin.exam.dto.AdminExamDtos.MediaUploadResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class AdminExamMediaService {
    private static final long MAX_FILE_BYTES = 20L * 1024 * 1024;
    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;

    public AdminExamMediaService(
            @Value("${cloudinary.cloud-name:}") String cloudName,
            @Value("${cloudinary.api-key:}") String apiKey,
            @Value("${cloudinary.api-secret:}") String apiSecret) {
        this.cloudName = normalize(cloudName);
        this.apiKey = normalize(apiKey);
        this.apiSecret = normalize(apiSecret);
    }

    public MediaUploadResponse upload(MultipartFile file, String rawResourceType) {
        String resourceType = normalize(rawResourceType).toLowerCase(Locale.ROOT);
        if (!resourceType.equals("image") && !resourceType.equals("audio")) {
            throw new IllegalArgumentException("Loại media phải là image hoặc audio.");
        }
        validate(file, resourceType);
        if (cloudName.isBlank() || apiKey.isBlank() || apiSecret.isBlank()) {
            throw new IllegalStateException("Cloudinary chưa được cấu hình cho media đề thi.");
        }
        try {
            Cloudinary cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName, "api_key", apiKey, "api_secret", apiSecret, "secure", true));
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "resource_type", resourceType.equals("audio") ? "video" : "image",
                    "folder", "exam-media",
                    "public_id", resourceType + "-" + UUID.randomUUID()));
            Object url = result.get("secure_url");
            Object publicId = result.get("public_id");
            if (url == null || publicId == null) {
                throw new IllegalStateException("Cloudinary không trả về đủ URL và public ID.");
            }
            return new MediaUploadResponse(url.toString(), publicId.toString());
        } catch (RuntimeException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new RuntimeException("Không thể tải media đề thi lên Cloudinary.", exception);
        }
    }

    private void validate(MultipartFile file, String resourceType) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Vui lòng chọn file để tải lên.");
        if (file.getSize() > MAX_FILE_BYTES) throw new IllegalArgumentException("File vượt quá giới hạn 20 MB.");
        String contentType = normalize(file.getContentType()).toLowerCase(Locale.ROOT);
        String expectedPrefix = resourceType.equals("audio") ? "audio/" : "image/";
        if (!contentType.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException("Định dạng file không khớp loại media " + resourceType + ".");
        }
    }

    private String normalize(String value) { return value == null ? "" : value.trim(); }
}
