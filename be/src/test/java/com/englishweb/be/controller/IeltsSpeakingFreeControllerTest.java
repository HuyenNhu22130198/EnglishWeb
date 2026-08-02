package com.englishweb.be.controller;

import com.englishweb.be.dto.ielts.IeltsSpeakingFreeTranscribeResponse;
import com.englishweb.be.dto.ielts.IeltsSpeakingFreeGradeResponse;
import com.englishweb.be.service.AzureSpeechTokenService;
import com.englishweb.be.service.IeltsSpeakingFreeService;
import com.englishweb.be.service.IeltsSpeakingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class IeltsSpeakingFreeControllerTest {
    private IeltsSpeakingFreeService freeService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        freeService = mock(IeltsSpeakingFreeService.class);
        IeltsSpeakingController controller = new IeltsSpeakingController(
                mock(IeltsSpeakingService.class),
                freeService,
                mock(AzureSpeechTokenService.class)
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void acceptsAuthenticatedMultipartTranscribeRequest() throws Exception {
        when(freeService.transcribeAnswer(
                eq(10), eq(20), eq("learner@example.com"), eq(40), eq(50),
                any(), eq(12)))
                .thenReturn(IeltsSpeakingFreeTranscribeResponse.builder()
                        .freeAnswerId(60)
                        .audioUrl("https://audio.test/answer.webm")
                        .whisperStatus("FAILED")
                        .build());

        MockMultipartFile audio = new MockMultipartFile(
                "audio", "answer.webm", "audio/webm", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/ielts/speaking/free/exams/10/attempts/20/answers")
                        .file(audio)
                        .param("speakingItemId", "40")
                        .param("sampleAnswerId", "50")
                        .param("durationSeconds", "12")
                        .principal(new UsernamePasswordAuthenticationToken(
                                "learner@example.com", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.freeAnswerId").value(60))
                .andExpect(jsonPath("$.data.whisperStatus").value("FAILED"))
                .andExpect(jsonPath("$.data.sampleAnswerText").doesNotExist());
    }

    @Test
    void acceptsEditedTranscriptOnlyOnSeparateSubmitRequest() throws Exception {
        when(freeService.submitAnswer(60, "learner@example.com", "My edited answer"))
                .thenReturn(IeltsSpeakingFreeGradeResponse.builder()
                        .freeAnswerId(60)
                        .transcriptText("My edited answer")
                        .geminiStatus("OK")
                        .sampleAnswerText("A model answer")
                        .build());

        mockMvc.perform(post("/api/ielts/speaking/free/answers/60/submit")
                        .contentType("application/json")
                        .content("{\"transcriptText\":\"My edited answer\"}")
                        .principal(new UsernamePasswordAuthenticationToken(
                                "learner@example.com", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.geminiStatus").value("OK"))
                .andExpect(jsonPath("$.data.sampleAnswerText").value("A model answer"));
    }
}
