package com.englishweb.be.service;

import com.englishweb.be.dto.ielts.IeltsPracticeResponse;
import com.englishweb.be.dto.ielts.IeltsSpeakingSaveRequest;
import com.englishweb.be.entity.User;
import com.englishweb.be.entity.ielts.IeltsSpeakingSampleAnswer;
import com.englishweb.be.entity.ielts.IeltsSpeakingTask;
import com.englishweb.be.repository.UserRepository;
import com.englishweb.be.repository.ielts.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class IeltsSpeakingServiceIntegrationTest {
    @Autowired private IeltsPracticeService practiceService;
    @Autowired private IeltsSpeakingService speakingService;
    @Autowired private IeltsSpeakingTaskRepository taskRepository;
    @Autowired private IeltsSpeakingSampleAnswerRepository sampleRepository;
    @Autowired private IeltsSpeakingUserAnswerRepository answerRepository;
    @Autowired private UserRepository userRepository;

    @Test
    void loadsThreePartsAndSavesAllFourPartTwoSegmentsIndependently() {
        IeltsSpeakingTask firstTask = taskRepository.findAll().stream().findFirst().orElseThrow();
        Integer examId = firstTask.getExam().getId();
        IeltsPracticeResponse practice = practiceService.getPracticeExam(examId, "SPEAKING");
        assertThat(practice.getSpeakingParts()).extracting(IeltsPracticeResponse.SpeakingPartResponse::getPartNo)
                .containsExactly(1, 2, 3);
        assertThat(practice.getSpeakingParts()).flatExtracting(IeltsPracticeResponse.SpeakingPartResponse::getSamples)
                .hasSize(14);

        User user = userRepository.findAll().stream().findFirst().orElseThrow();
        Integer attemptId = (Integer) speakingService.startAttempt(examId, user.getEmail()).get("attemptId");
        IeltsSpeakingTask partTwo = taskRepository.findByExam_IdOrderByPartNoAscDisplayOrderAscIdAsc(examId).stream()
                .filter(task -> task.getPartNo() == 2).findFirst().orElseThrow();
        List<IeltsSpeakingSampleAnswer> segments = sampleRepository
                .findBySpeakingTask_IdOrderByDisplayOrderAscIdAsc(partTwo.getId());
        assertThat(segments).hasSize(4);

        for (IeltsSpeakingSampleAnswer segment : segments) {
            IeltsSpeakingSaveRequest request = new IeltsSpeakingSaveRequest();
            request.setAttemptId(attemptId); request.setSampleAnswerId(segment.getId());
            request.setRecognizedText("Recognized sample text"); request.setDurationSeconds(5);
            request.setPronunciationScore(new BigDecimal("80")); request.setAccuracyScore(new BigDecimal("81"));
            request.setFluencyScore(new BigDecimal("82")); request.setCompletenessScore(new BigDecimal("83"));
            request.setResultJson("{\"NBest\":[]}");
            speakingService.saveAnswer(examId, user.getEmail(), request);
        }
        IeltsSpeakingSaveRequest retry = new IeltsSpeakingSaveRequest();
        retry.setAttemptId(attemptId); retry.setSampleAnswerId(segments.getFirst().getId());
        retry.setRecognizedText("Latest recognized text"); retry.setDurationSeconds(4);
        retry.setPronunciationScore(new BigDecimal("91")); retry.setAccuracyScore(new BigDecimal("92"));
        retry.setFluencyScore(new BigDecimal("93")); retry.setCompletenessScore(new BigDecimal("94"));
        retry.setResultJson("{\"NBest\":[]}");
        speakingService.saveAnswer(examId, user.getEmail(), retry);

        assertThat(answerRepository.findResultAnswers(attemptId)).hasSize(4)
                .allSatisfy(answer -> {
                    assertThat(answer.getReferenceText()).isEqualTo(answer.getSampleAnswer().getAnswerText().trim());
                    assertThat(answer.getBandScore()).isNull();
                    assertThat(answer.getFeedbackText()).isNull();
                });
        assertThat(answerRepository.findByAttempt_IdAndSampleAnswer_Id(attemptId, segments.getFirst().getId())
                .orElseThrow().getPronunciationScore()).isEqualByComparingTo("91");
        assertThat(speakingService.completeAttempt(examId, attemptId, user.getEmail()).getPracticedCount()).isEqualTo(4);
        userRepository.findAll().stream().filter(candidate -> !candidate.getEmail().equals(user.getEmail())).findFirst()
                .ifPresent(other -> assertThatThrownBy(() -> speakingService.getResult(attemptId, other.getEmail()))
                        .isInstanceOf(RuntimeException.class));
    }

    @Test
    void browserAssessmentUsesDatabaseReferenceAndLcsAndAllowsRetry() {
        IeltsSpeakingSampleAnswer sample = sampleRepository.findAll().stream().findFirst().orElseThrow();
        Integer examId = sample.getSpeakingTask().getExam().getId();
        User user = userRepository.findAll().stream().findFirst().orElseThrow();
        Integer attemptId = (Integer) speakingService.startAttempt(examId, user.getEmail()).get("attemptId");

        IeltsSpeakingSaveRequest nearlyExact = new IeltsSpeakingSaveRequest();
        nearlyExact.setAttemptId(attemptId);
        nearlyExact.setSampleAnswerId(sample.getId());
        nearlyExact.setRecognizedText(sample.getAnswerText() + " extra");
        nearlyExact.setDurationSeconds(8);
        nearlyExact.setResultJson("{\"assessmentSource\":\"BROWSER\",\"readingMatchScore\":1,\"referenceText\":\"untrusted\"}");
        var first = speakingService.saveAnswer(examId, user.getEmail(), nearlyExact);

        assertThat(first.getPronunciationScore()).isNull();
        assertThat(first.getReferenceText()).isEqualTo(sample.getAnswerText().trim());
        assertThat(first.getResultJson()).contains("\"assessmentSource\":\"BROWSER\"")
                .contains("\"extraWordCount\":1")
                .doesNotContain("untrusted");

        IeltsSpeakingSaveRequest retry = new IeltsSpeakingSaveRequest();
        retry.setAttemptId(attemptId);
        retry.setSampleAnswerId(sample.getId());
        retry.setRecognizedText("unrelated words");
        retry.setDurationSeconds(2);
        retry.setResultJson("{\"assessmentSource\":\"BROWSER\"}");
        var second = speakingService.saveAnswer(examId, user.getEmail(), retry);

        assertThat(answerRepository.findResultAnswers(attemptId)).hasSize(1);
        assertThat(second.getResultJson()).contains("\"matchedWordCount\":0", "\"readingMatchScore\":0.00");
    }
}
