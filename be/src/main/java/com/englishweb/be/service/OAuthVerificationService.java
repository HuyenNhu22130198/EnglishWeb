package com.englishweb.be.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

@Service
public class OAuthVerificationService {

    private final RestClient restClient;
    private final String googleClientId;
    private final String facebookAppId;
    private final String facebookAppSecret;

    public OAuthVerificationService(
            @Value("${app.oauth.google.client-id:}") String googleClientId,
            @Value("${app.oauth.facebook.app-id:}") String facebookAppId,
            @Value("${app.oauth.facebook.app-secret:}") String facebookAppSecret
    ) {
        this.restClient = RestClient.create();
        this.googleClientId = googleClientId;
        this.facebookAppId = facebookAppId;
        this.facebookAppSecret = facebookAppSecret;
    }

    public OAuthProfile verify(String provider, String credential) {
        return switch (provider) {
            case "GOOGLE" -> verifyGoogle(credential);
            case "FACEBOOK" -> verifyFacebook(credential);
            default -> throw new RuntimeException("Nhà cung cấp đăng nhập không được hỗ trợ.");
        };
    }

    private OAuthProfile verifyGoogle(String credential) {
        requireConfigured(googleClientId, "Google Client ID");

        try {
            Map<String, Object> payload = restClient.get()
                    .uri("https://oauth2.googleapis.com/tokeninfo?id_token={credential}", credential)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (payload == null
                    || !googleClientId.equals(stringValue(payload.get("aud")))
                    || !isTrue(payload.get("email_verified"))) {
                throw new RuntimeException("Thông tin xác thực Google không hợp lệ.");
            }

            return profileFromPayload("GOOGLE", payload);
        } catch (RestClientException exception) {
            throw new RuntimeException("Không thể xác thực tài khoản Google.", exception);
        }
    }

    private OAuthProfile verifyFacebook(String credential) {
        requireConfigured(facebookAppId, "Facebook App ID");
        requireConfigured(facebookAppSecret, "Facebook App Secret");

        try {
            Map<String, Object> debugResponse = restClient.get()
                    .uri(
                            "https://graph.facebook.com/debug_token?input_token={credential}&access_token={appAccessToken}",
                            credential,
                            facebookAppId + "|" + facebookAppSecret
                    )
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            Map<?, ?> debugData = debugResponse != null && debugResponse.get("data") instanceof Map<?, ?> data
                    ? data
                    : Map.of();
            if (!isTrue(debugData.get("is_valid"))
                    || !facebookAppId.equals(stringValue(debugData.get("app_id")))) {
                throw new RuntimeException("Thông tin xác thực Facebook không hợp lệ.");
            }

            Map<String, Object> profile = restClient.get()
                    .uri(
                            "https://graph.facebook.com/me?fields=id,email,name&access_token={credential}",
                            credential
                    )
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            return profileFromPayload("FACEBOOK", profile);
        } catch (RestClientException exception) {
            throw new RuntimeException("Không thể xác thực tài khoản Facebook.", exception);
        }
    }

    private OAuthProfile profileFromPayload(String provider, Map<String, Object> payload) {
        if (payload == null) {
            throw new RuntimeException("Không nhận được thông tin tài khoản từ " + provider + ".");
        }

        String providerId = stringValue(payload.get(provider.equals("GOOGLE") ? "sub" : "id"));
        String email = stringValue(payload.get("email"));
        String name = stringValue(payload.get("name"));

        if (providerId.isBlank() || email.isBlank()) {
            throw new RuntimeException("Tài khoản " + provider + " phải cung cấp email.");
        }

        return new OAuthProfile(provider, providerId, email, name.isBlank() ? email : name);
    }

    private void requireConfigured(String value, String settingName) {
        if (value == null || value.isBlank()) {
            throw new RuntimeException(settingName + " chưa được cấu hình.");
        }
    }

    private boolean isTrue(Object value) {
        return value instanceof Boolean bool ? bool : "true".equalsIgnoreCase(stringValue(value));
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    public record OAuthProfile(String provider, String providerId, String email, String name) {}
}
