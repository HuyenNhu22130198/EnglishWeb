package com.englishweb.be.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;

@Service
public class WhisperTranscriptionService {
    private final String serverUrl;
    private final int timeoutSeconds;
    private final HttpClient httpClient;
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    public WhisperTranscriptionService(
            @Value("${whisper.server-url:}") String serverUrl,
            @Value("${whisper.timeout-seconds:60}") int timeoutSeconds
    ) {
        this.serverUrl = stripTrailingSlash(normalize(serverUrl));
        this.timeoutSeconds = Math.max(1, timeoutSeconds);
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    public TranscriptionResult transcribe(byte[] audioBytes, String originalFilename) {
        if (audioBytes == null || audioBytes.length == 0) {
            return TranscriptionResult.failed("Audio rỗng nên Whisper không thể phiên âm.");
        }
        if (serverUrl.isBlank()) {
            return TranscriptionResult.failed("Whisper chưa được cấu hình. Hãy đặt WHISPER_SERVER_URL.");
        }

        try {
            String boundary = "----EnglishWebWhisper" + UUID.randomUUID();
            byte[] body = buildMultipartBody(boundary, audioBytes, originalFilename);
            HttpRequest request = HttpRequest.newBuilder(URI.create(serverUrl + "/inference"))
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                    .build();
            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return TranscriptionResult.failed(
                        "Whisper server trả về HTTP " + response.statusCode() + detail(response.body()));
            }

            JsonNode root = jsonMapper.readTree(response.body());
            String transcript = extractTranscript(root);
            if (transcript.isBlank()) {
                return TranscriptionResult.failed("Whisper không nhận diện được nội dung lời nói.");
            }
            return new TranscriptionResult("OK", transcript, null);
        } catch (Exception exception) {
            return TranscriptionResult.failed("Không thể kết nối Whisper server: " + safeMessage(exception));
        }
    }

    // whisper-server (examples/server) expects a multipart "file" field and an optional
    // "response_format" field; response_format=json returns {"text": "..."}.
    private byte[] buildMultipartBody(String boundary, byte[] audioBytes, String originalFilename)
            throws IOException {
        String filename = (originalFilename == null || originalFilename.isBlank())
                ? "audio.webm" : originalFilename;
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write((
                "--" + boundary + "\r\n"
                        + "Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n"
                        + "Content-Type: application/octet-stream\r\n\r\n"
        ).getBytes(StandardCharsets.UTF_8));
        out.write(audioBytes);
        out.write((
                "\r\n--" + boundary + "\r\n"
                        + "Content-Disposition: form-data; name=\"response_format\"\r\n\r\n"
                        + "json\r\n"
                        + "--" + boundary + "--\r\n"
        ).getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }

    private String extractTranscript(JsonNode root) {
        StringBuilder transcript = new StringBuilder();
        appendText(root.path("transcription"), transcript);
        if (transcript.isEmpty()) {
            appendText(root.path("segments"), transcript);
        }
        if (transcript.isEmpty() && root.path("text").isTextual()) {
            transcript.append(root.path("text").asText());
        }
        return transcript.toString().trim().replaceAll("\\s+", " ");
    }

    private void appendText(JsonNode nodes, StringBuilder target) {
        if (!nodes.isArray()) return;
        for (JsonNode node : nodes) {
            String text = node.path("text").asText("").trim();
            if (!text.isBlank()) {
                if (!target.isEmpty()) target.append(' ');
                target.append(text);
            }
        }
    }

    private String detail(String body) {
        if (body == null || body.isBlank()) return "";
        String compact = body.replaceAll("\\s+", " ").trim();
        return ": " + compact.substring(0, Math.min(400, compact.length()));
    }

    private String stripTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String safeMessage(Exception exception) {
        return exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
    }

    public record TranscriptionResult(String status, String transcript, String error) {
        static TranscriptionResult failed(String error) {
            return new TranscriptionResult("FAILED", null, error);
        }
    }
}
