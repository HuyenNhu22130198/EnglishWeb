package com.englishweb.be.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class IeltsWritingSimilarityService {

    public static final Set<String> ENGLISH_STOP_WORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "been", "but", "by",
            "for", "from", "has", "have", "he", "her", "his", "i", "in", "is",
            "it", "its", "of", "on", "or", "she", "that", "the", "their", "there",
            "they", "this", "to", "was", "were", "will", "with", "you", "your"
    );

    public SimilarityResult compare(String userText, String sampleText) {
        List<String> userTokens = normalizeAndTokenize(userText);
        List<String> sampleTokens = normalizeAndTokenize(sampleText);

        if (userTokens.isEmpty() || sampleTokens.isEmpty()) {
            return new SimilarityResult(0, BigDecimal.ZERO.setScale(2));
        }

        Map<String, Long> userFrequencies = frequencies(userTokens);
        Map<String, Long> sampleFrequencies = frequencies(sampleTokens);
        int matchedWordCount = userFrequencies.entrySet().stream()
                .mapToInt(entry -> Math.toIntExact(Math.min(
                        entry.getValue(),
                        sampleFrequencies.getOrDefault(entry.getKey(), 0L)
                )))
                .sum();

        BigDecimal numerator = BigDecimal.valueOf(2L * matchedWordCount * 100L);
        BigDecimal denominator = BigDecimal.valueOf((long) userTokens.size() + sampleTokens.size());
        BigDecimal percent = numerator.divide(denominator, 2, RoundingMode.HALF_UP)
                .max(BigDecimal.ZERO.setScale(2))
                .min(BigDecimal.valueOf(100).setScale(2));

        return new SimilarityResult(matchedWordCount, percent);
    }

    public List<String> normalizeAndTokenize(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }

        String normalized = Normalizer.normalize(text.toLowerCase(Locale.ROOT), Normalizer.Form.NFKC)
                .replaceAll("[^\\p{L}\\p{N}]+", " ")
                .trim()
                .replaceAll("\\s+", " ");

        if (normalized.isBlank()) {
            return Collections.emptyList();
        }

        return Arrays.stream(normalized.split(" "))
                .filter(token -> !token.isBlank())
                .filter(token -> !ENGLISH_STOP_WORDS.contains(token))
                .toList();
    }

    private Map<String, Long> frequencies(List<String> tokens) {
        return tokens.stream().collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
    }

    public record SimilarityResult(int matchedWordCount, BigDecimal similarityPercent) {
    }
}
