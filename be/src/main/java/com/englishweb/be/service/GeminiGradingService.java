package com.englishweb.be.service;

import com.englishweb.be.dto.ielts.GeminiErrorItem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeminiGradingService {
    private final String apiKey;
    private final String model;
    private final int timeoutSeconds;
    private final HttpClient httpClient;
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    public GeminiGradingService(
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.model:gemini-2.0-flash}") String model,
            @Value("${gemini.timeout-seconds:30}") int timeoutSeconds
    ) {
        this.apiKey = normalize(apiKey);
        this.model = normalize(model).isBlank() ? "gemini-2.0-flash" : normalize(model);
        this.timeoutSeconds = Math.max(1, timeoutSeconds);
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    public GradingResult grade(String question, String transcript) {
        if (apiKey.isBlank()) {
            return GradingResult.failed("Gemini chưa được cấu hình. Hãy đặt GEMINI_API_KEY.", null);
        }
        if (transcript == null || transcript.isBlank()) {
            return GradingResult.skipped("Bỏ qua Gemini vì không có transcript.");
        }

        String rawResponse = null;
        try {
            String encodedModel = URLEncoder.encode(model, StandardCharsets.UTF_8).replace("+", "%20");
            URI endpoint = URI.create("https://generativelanguage.googleapis.com/v1beta/models/"
                    + encodedModel + ":generateContent?key="
                    + URLEncoder.encode(apiKey, StandardCharsets.UTF_8));
            String payload = jsonMapper.writeValueAsString(buildPayload(question, transcript));
            HttpRequest request = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            rawResponse = response.body();
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return GradingResult.failed(
                        "Gemini trả về HTTP " + response.statusCode() + responseDetail(rawResponse),
                        validJsonOrNull(rawResponse));
            }

            JsonNode root = jsonMapper.readTree(rawResponse);
            String structuredText = root.path("candidates").path(0).path("content")
                    .path("parts").path(0).path("text").asText("");
            if (structuredText.isBlank()) {
                return GradingResult.failed("Gemini không trả về structured output.", rawResponse);
            }
            JsonNode grade = jsonMapper.readTree(structuredText);
            List<GeminiErrorItem> errors = parseErrors(grade.path("errors"));
            return new GradingResult(
                    "OK",
                    score(grade, "relevanceScore"),
                    score(grade, "ideaDevelopmentScore"),
                    score(grade, "grammarScore"),
                    score(grade, "vocabularyScore"),
                    score(grade, "coherenceScore"),
                    score(grade, "overallBandEstimate"),
                    errors,
                    grade.path("correctedAnswer").asText(""),
                    rawResponse,
                    null
            );
        } catch (Exception exception) {
            return GradingResult.failed(
                    "Không thể chấm nội dung bằng Gemini: " + safeMessage(exception),
                    validJsonOrNull(rawResponse));
        }
    }

    private Map<String, Object> buildPayload(String question, String transcript) {
        String prompt = """
                You are an objective IELTS Speaking examiner. Grade the candidate's spontaneous answer.

                Question:
                %s

                Candidate transcript:
                %s

                Use IELTS Speaking principles: task relevance, sufficiently developed and supported ideas,
                grammatical range and accuracy, lexical resource, and fluency/coherence. Scores are from 0 to 9.
                Be evidence-based. List concrete errors or weaknesses with an actionable correction.
                correctedAnswer must preserve the candidate's intended meaning while improving grammar,
                vocabulary, relevance and coherence. Return only the schema-defined JSON.
                """.formatted(normalize(question), transcript.trim());

        Map<String, Object> scoreSchema = Map.of(
                "type", "NUMBER", "minimum", 0, "maximum", 9
        );
        Map<String, Object> errorSchema = new LinkedHashMap<>();
        errorSchema.put("type", "OBJECT");
        errorSchema.put("properties", Map.of(
                "type", Map.of("type", "STRING"),
                "original", Map.of("type", "STRING"),
                "suggestion", Map.of("type", "STRING"),
                "explanation", Map.of("type", "STRING")
        ));
        errorSchema.put("required", List.of("type", "original", "suggestion", "explanation"));

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "OBJECT");
        schema.put("properties", Map.of(
                "relevanceScore", scoreSchema,
                "ideaDevelopmentScore", scoreSchema,
                "grammarScore", scoreSchema,
                "vocabularyScore", scoreSchema,
                "coherenceScore", scoreSchema,
                "overallBandEstimate", scoreSchema,
                "errors", Map.of("type", "ARRAY", "items", errorSchema),
                "correctedAnswer", Map.of("type", "STRING")
        ));
        schema.put("required", List.of(
                "relevanceScore", "ideaDevelopmentScore", "grammarScore", "vocabularyScore",
                "coherenceScore", "overallBandEstimate", "errors", "correctedAnswer"
        ));

        return Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.2,
                        "responseMimeType", "application/json",
                        "responseSchema", schema
                )
        );
    }

    private List<GeminiErrorItem> parseErrors(JsonNode node) {
        List<GeminiErrorItem> errors = new ArrayList<>();
        if (!node.isArray()) return errors;
        for (JsonNode item : node) {
            errors.add(GeminiErrorItem.builder()
                    .type(item.path("type").asText(""))
                    .original(item.path("original").asText(""))
                    .suggestion(item.path("suggestion").asText(""))
                    .explanation(item.path("explanation").asText(""))
                    .build());
        }
        return errors;
    }

    private BigDecimal score(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (!value.isNumber()) {
            throw new IllegalArgumentException("Gemini thiếu trường số " + field + ".");
        }
        BigDecimal score = value.decimalValue();
        if (score.compareTo(BigDecimal.ZERO) < 0 || score.compareTo(BigDecimal.valueOf(9)) > 0) {
            throw new IllegalArgumentException("Gemini trả về " + field + " ngoài thang 0-9.");
        }
        return score;
    }

    private String validJsonOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            jsonMapper.readTree(value);
            return value;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String responseDetail(String body) {
        if (body == null || body.isBlank()) return "";
        String compact = body.replaceAll("\\s+", " ").trim();
        return ": " + compact.substring(0, Math.min(400, compact.length()));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String safeMessage(Exception exception) {
        return exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
    }

    public record GradingResult(
            String status,
            BigDecimal relevanceScore,
            BigDecimal ideaDevelopmentScore,
            BigDecimal grammarScore,
            BigDecimal vocabularyScore,
            BigDecimal coherenceScore,
            BigDecimal overallBandEstimate,
            List<GeminiErrorItem> errors,
            String correctedAnswer,
            String rawJson,
            String error
    ) {
        static GradingResult failed(String error, String rawJson) {
            return new GradingResult("FAILED", null, null, null, null, null, null,
                    List.of(), null, rawJson, error);
        }

        static GradingResult skipped(String reason) {
            return new GradingResult("SKIPPED", null, null, null, null, null, null,
                    List.of(), null, null, reason);
        }
    }
}
