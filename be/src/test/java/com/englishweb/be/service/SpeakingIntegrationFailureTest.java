package com.englishweb.be.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class SpeakingIntegrationFailureTest {
    @Test
    void missingGeminiKeyReturnsFailedResultWithoutThrowing() {
        GeminiGradingService service = new GeminiGradingService("", "gemini-2.0-flash", 1);
        assertThat(service.grade("Question", "Spoken answer").status()).isEqualTo("FAILED");
    }

    @Test
    void missingWhisperServerUrlReturnsFailedResultWithoutThrowing() {
        WhisperTranscriptionService service = new WhisperTranscriptionService("", 1);

        assertThatCode(() -> service.transcribe(new byte[]{1, 2, 3}, "answer.webm"))
                .doesNotThrowAnyException();
        assertThat(service.transcribe(new byte[]{1, 2, 3}, "answer.webm").status())
                .isEqualTo("FAILED");
    }
}
