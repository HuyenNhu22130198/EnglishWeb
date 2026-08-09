package com.englishweb.be.service;

import com.englishweb.be.dto.ielts.IeltsSpeakingFreeGradeResponse;
import com.englishweb.be.dto.ielts.IeltsSpeakingFreeTranscribeResponse;
import com.englishweb.be.entity.User;
import com.englishweb.be.entity.ielts.*;
import com.englishweb.be.repository.ielts.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IeltsSpeakingFreeServiceTest {
    @Mock private IeltsAttemptRepository attemptRepository;
    @Mock private IeltsSpeakingItemRepository itemRepository;
    @Mock private IeltsSpeakingSampleAnswerRepository sampleRepository;
    @Mock private IeltsSpeakingFreeAnswerRepository freeAnswerRepository;
    @Mock private AudioStorageService audioStorageService;
    @Mock private WhisperTranscriptionService whisperService;
    @Mock private GeminiGradingService geminiService;

    private IeltsSpeakingFreeService service;
    private MockMultipartFile audio;
    private IeltsAttempt attempt;
    private IeltsSpeakingItem item;

    @BeforeEach
    void setUp() {
        service = new IeltsSpeakingFreeService(
                attemptRepository, itemRepository, sampleRepository, freeAnswerRepository,
                audioStorageService, whisperService, geminiService);
        audio = new MockMultipartFile(
                "audio", "answer.webm", "audio/webm", new byte[]{1, 2, 3});

        IeltsExam exam = IeltsExam.builder().id(10).build();
        attempt = IeltsAttempt.builder()
                .id(20)
                .user(User.builder().email("learner@example.com").build())
                .exam(exam).skill("SPEAKING").status("IN_PROGRESS").build();
        IeltsSpeakingTask task = IeltsSpeakingTask.builder()
                .id(30).exam(exam).partNo(1).topicTitle("Home").instructionText("Answer").build();
        item = IeltsSpeakingItem.builder()
                .id(40).speakingTask(task).contentText("Where do you live?").build();
    }

    @Test
    void whisperFailureStillPersistsTranscribedRecord() {
        when(attemptRepository.findByIdAndUser_Email(20, "learner@example.com"))
                .thenReturn(Optional.of(attempt));
        when(itemRepository.findById(40)).thenReturn(Optional.of(item));
        when(audioStorageService.upload(audio))
                .thenReturn(new AudioStorageService.UploadResult("https://audio.test/a.webm", "audio-id"));
        when(whisperService.transcribe(any(), eq("answer.webm")))
                .thenReturn(WhisperTranscriptionService.TranscriptionResult.failed(
                        "Whisper server unavailable"));
        when(freeAnswerRepository.save(any())).thenAnswer(invocation -> {
            IeltsSpeakingFreeAnswer answer = invocation.getArgument(0);
            answer.setId(50);
            return answer;
        });

        IeltsSpeakingFreeTranscribeResponse response = service.transcribeAnswer(
                10, 20, "learner@example.com", 40, null, audio, 12);

        assertThat(response.getFreeAnswerId()).isEqualTo(50);
        assertThat(response.getAudioUrl()).isEqualTo("https://audio.test/a.webm");
        assertThat(response.getWhisperStatus()).isEqualTo("FAILED");
        assertThat(response.getTranscriptText()).isNull();
        verify(freeAnswerRepository).save(any(IeltsSpeakingFreeAnswer.class));
        verifyNoInteractions(geminiService);
    }

    @Test
    void uploadFailureStopsPipelineAndDoesNotPersist() {
        when(attemptRepository.findByIdAndUser_Email(20, "learner@example.com"))
                .thenReturn(Optional.of(attempt));
        when(itemRepository.findById(40)).thenReturn(Optional.of(item));
        when(audioStorageService.upload(audio))
                .thenThrow(new RuntimeException("Cloudinary unavailable"));

        assertThatThrownBy(() -> service.transcribeAnswer(
                10, 20, "learner@example.com", 40, null, audio, 12))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Cloudinary unavailable");

        verifyNoInteractions(whisperService, geminiService);
        verify(freeAnswerRepository, never()).save(any());
    }

    @Test
    void geminiFailureKeepsEditedTranscriptAndCanBeRetried() {
        IeltsSpeakingFreeAnswer answer = IeltsSpeakingFreeAnswer.builder()
                .id(50).attempt(attempt).speakingTask(item.getSpeakingTask()).speakingItem(item)
                .questionText(item.getContentText()).audioUrl("https://audio.test/a.webm")
                .audioPublicId("audio-id").whisperStatus("OK").status("TRANSCRIBED").build();
        when(freeAnswerRepository.findById(50)).thenReturn(Optional.of(answer));
        when(geminiService.grade(item.getContentText(), "My edited answer"))
                .thenReturn(new GeminiGradingService.GradingResult(
                        "FAILED", null, null, null, null, null, null,
                        List.of(), null, null, "Invalid API key"));
        when(freeAnswerRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        IeltsSpeakingFreeGradeResponse response =
                service.submitAnswer(50, "learner@example.com", " My edited answer ");

        assertThat(response.getGeminiStatus()).isEqualTo("FAILED");
        assertThat(response.getTranscriptText()).isEqualTo("My edited answer");
        assertThat(answer.getStatus()).isEqualTo("GRADED");
        assertThat(answer.getGeminiError()).contains("Invalid API key");
    }
}
