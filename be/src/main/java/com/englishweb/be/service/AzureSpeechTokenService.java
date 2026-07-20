package com.englishweb.be.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.Map;

@Service
public class AzureSpeechTokenService {
    private final String key;
    private final String region;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();

    public AzureSpeechTokenService(
            @Value("${azure.speech.key:}") String key,
            @Value("${azure.speech.region:}") String region
    ) { this.key = key == null ? "" : key.trim(); this.region = region == null ? "" : region.trim(); }

    public Map<String, String> issueToken() {
        if (key.isBlank() || region.isBlank()) {
            throw new RuntimeException("Tính năng luyện phát âm chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
        }
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://" + region + ".api.cognitive.microsoft.com/sts/v1.0/issueToken"))
                    .timeout(Duration.ofSeconds(10)).header("Ocp-Apim-Subscription-Key", key)
                    .POST(HttpRequest.BodyPublishers.noBody()).build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2 || response.body() == null || response.body().isBlank()) {
                throw new RuntimeException("Không thể kết nối dịch vụ đánh giá phát âm lúc này. Vui lòng thử lại.");
            }
            return Map.of("token", response.body(), "region", region);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Yêu cầu lấy quyền đánh giá phát âm đã bị gián đoạn.");
        } catch (IllegalArgumentException | java.io.IOException e) {
            throw new RuntimeException("Không thể kết nối dịch vụ đánh giá phát âm lúc này. Vui lòng thử lại.");
        }
    }
}
