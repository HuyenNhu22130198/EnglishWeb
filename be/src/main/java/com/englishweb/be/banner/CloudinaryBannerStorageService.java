package com.englishweb.be.banner;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
public class CloudinaryBannerStorageService {

    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;

    public CloudinaryBannerStorageService(
            @Value("${cloudinary.cloud-name:}") String cloudName,
            @Value("${cloudinary.api-key:}") String apiKey,
            @Value("${cloudinary.api-secret:}") String apiSecret
    ) {
        this.cloudName = cloudName == null ? "" : cloudName.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.apiSecret = apiSecret == null ? "" : apiSecret.trim();
    }

    public String uploadBanner(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Vui long chon anh banner truoc khi tai len.");
        }

        if (cloudName.isBlank() || apiKey.isBlank() || apiSecret.isBlank()) {
            throw new RuntimeException("Cloudinary chua duoc cau hinh. Hay them CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY va CLOUDINARY_API_SECRET.");
        }

        try {
            Map<?, ?> result = createCloudinary().uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "banner",
                            "resource_type", "image",
                            "public_id", buildPublicId(file.getOriginalFilename())
                    )
            );

            Object secureUrl = result.get("secure_url");
            if (secureUrl == null) {
                throw new RuntimeException("Cloudinary khong tra ve URL anh.");
            }

            return secureUrl.toString();
        } catch (IOException exception) {
            throw new RuntimeException("Khong the doc file anh de tai len Cloudinary.", exception);
        } catch (Exception exception) {
            throw new RuntimeException("Khong the tai anh banner len Cloudinary.", exception);
        }
    }

    private Cloudinary createCloudinary() {
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
        ));
    }

    private String buildPublicId(String originalFilename) {
        String normalizedName = (originalFilename == null ? "banner" : originalFilename)
                .replaceAll("\\.[^.]+$", "")
                .replaceAll("[^a-zA-Z0-9-_]+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");

        if (normalizedName.isBlank()) {
            normalizedName = "banner";
        }

        return normalizedName + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
