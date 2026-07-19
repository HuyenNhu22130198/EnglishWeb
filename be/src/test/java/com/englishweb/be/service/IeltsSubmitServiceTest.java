package com.englishweb.be.service;

import com.englishweb.be.dto.ielts.IeltsResultResponse;
import com.englishweb.be.dto.ielts.IeltsSubmitRequest;
import com.englishweb.be.entity.User;
import com.englishweb.be.entity.ielts.IeltsAttempt;
import com.englishweb.be.entity.ielts.IeltsExam;
import com.englishweb.be.entity.ielts.IeltsLrUserAnswer;
import com.englishweb.be.entity.ielts.IeltsQuestion;
import com.englishweb.be.entity.ielts.IeltsQuestionAnswer;
import com.englishweb.be.entity.ielts.IeltsQuestionBlock;
import com.englishweb.be.entity.ielts.IeltsQuestionOption;
import com.englishweb.be.entity.ielts.IeltsSectionGroup;
import com.englishweb.be.exception.IeltsSubmissionException;
import com.englishweb.be.repository.UserRepository;
import com.englishweb.be.repository.ielts.IeltsAttemptRepository;
import com.englishweb.be.repository.ielts.IeltsExamRepository;
import com.englishweb.be.repository.ielts.IeltsLrUserAnswerRepository;
import com.englishweb.be.repository.ielts.IeltsQuestionAnswerRepository;
import com.englishweb.be.repository.ielts.IeltsQuestionOptionRepository;
import com.englishweb.be.repository.ielts.IeltsQuestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IeltsSubmitServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private IeltsExamRepository examRepository;
    @Mock
    private IeltsQuestionRepository questionRepository;
    @Mock
    private IeltsQuestionOptionRepository optionRepository;
    @Mock
    private IeltsQuestionAnswerRepository questionAnswerRepository;
    @Mock
    private IeltsAttemptRepository attemptRepository;
    @Mock
    private IeltsLrUserAnswerRepository userAnswerRepository;

    private IeltsSubmitService service;
    private IeltsExam exam;
    private List<IeltsLrUserAnswer> persistedAnswers;

    @BeforeEach
    void setUp() {
        service = new IeltsSubmitService(
                userRepository,
                examRepository,
                questionRepository,
                optionRepository,
                questionAnswerRepository,
                attemptRepository,
                userAnswerRepository,
                new IeltsScoreService()
        );

        exam = IeltsExam.builder().id(10).examCode("IELTS-10").examName("IELTS Test 10").build();
        persistedAnswers = new ArrayList<>();

        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(User.builder().id(1).email("user@test.com").build()));
        when(examRepository.findById(10)).thenReturn(Optional.of(exam));
        when(attemptRepository.save(any(IeltsAttempt.class))).thenAnswer(invocation -> {
            IeltsAttempt attempt = invocation.getArgument(0);
            attempt.setId(100);
            return attempt;
        });
        lenient().when(attemptRepository.saveAndFlush(any(IeltsAttempt.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userAnswerRepository.save(any(IeltsLrUserAnswer.class))).thenAnswer(invocation -> {
            IeltsLrUserAnswer answer = invocation.getArgument(0);
            answer.setId(persistedAnswers.size() + 1);
            persistedAnswers.add(answer);
            return answer;
        });
        when(userAnswerRepository.saveAllAndFlush(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(userAnswerRepository.findResultAnswers(100)).thenAnswer(invocation -> persistedAnswers);
        lenient().when(optionRepository.findByQuestion_QuestionIdInOrderByQuestion_QuestionIdAscDisplayOrderAscIdAsc(anyList()))
                .thenReturn(List.of());
    }

    @Test
    void submitListeningWithoutAnswersPersistsEveryQuestionAsUnanswered() {
        List<IeltsQuestion> questions = questions("LISTENING", 2);
        configureQuestionsAndAcceptedAnswers(questions, List.of());

        IeltsResultResponse result = service.submitExam(10, "user@test.com", "LISTENING", new IeltsSubmitRequest(List.of()));

        assertThat(result.getAttemptId()).isEqualTo(100);
        assertThat(result.getTotalQuestions()).isEqualTo(2);
        assertThat(result.getAnsweredCount()).isZero();
        assertThat(result.getCorrectCount()).isZero();
        assertThat(result.getBandScore()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(persistedAnswers).allSatisfy(answer -> {
            assertThat(answer.getSelectedOption()).isNull();
            assertThat(answer.getSelectedOptionKey()).isNull();
            assertThat(answer.getAnswerText()).isNull();
            assertThat(answer.getIsCorrect()).isFalse();
            assertThat(answer.getAnsweredAt()).isNull();
        });
    }

    @Test
    void submitListeningNormalizesPartialAnswersAndKeepsBlankObjectsUnanswered() {
        List<IeltsQuestion> questions = questions("LISTENING", 3);
        IeltsQuestionOption optionA = IeltsQuestionOption.builder()
                .id(50)
                .question(questions.get(0))
                .optionKey("A")
                .optionText("First option")
                .build();
        List<IeltsQuestionAnswer> acceptedAnswers = List.of(
                acceptedKey(questions.get(0), "A"),
                acceptedText(questions.get(1), "NEW ZEALAND")
        );
        configureQuestionsAndAcceptedAnswers(questions, acceptedAnswers);
        when(optionRepository.findByQuestion_QuestionIdAndOptionKeyIgnoreCase(questions.get(0).getQuestionId(), "A"))
                .thenReturn(Optional.of(optionA));

        IeltsSubmitRequest request = new IeltsSubmitRequest(List.of(
                new IeltsSubmitRequest.AnswerRequest(questions.get(0).getQuestionId(), " a ", null),
                new IeltsSubmitRequest.AnswerRequest(questions.get(1).getQuestionId(), null, "  New   Zealand "),
                new IeltsSubmitRequest.AnswerRequest(questions.get(2).getQuestionId(), "  ", " ")
        ));

        IeltsResultResponse result = service.submitExam(10, "user@test.com", "LISTENING", request);

        assertThat(result.getTotalQuestions()).isEqualTo(3);
        assertThat(result.getAnsweredCount()).isEqualTo(2);
        assertThat(result.getCorrectCount()).isEqualTo(2);
        assertThat(result.getBandScore()).isEqualByComparingTo("2.0");
        assertThat(persistedAnswers.get(0).getSelectedOptionKey()).isEqualTo("A");
        assertThat(persistedAnswers.get(0).getSelectedOption()).isSameAs(optionA);
        assertThat(persistedAnswers.get(0).getAnsweredAt()).isNotNull();
        assertThat(persistedAnswers.get(1).getAnswerText()).isEqualTo("NEW ZEALAND");
        assertThat(persistedAnswers.get(1).getAnsweredAt()).isNotNull();
        assertThat(persistedAnswers.get(2).getSelectedOptionKey()).isNull();
        assertThat(persistedAnswers.get(2).getAnswerText()).isNull();
        assertThat(persistedAnswers.get(2).getAnsweredAt()).isNull();
        assertThat(persistedAnswers.get(2).getIsCorrect()).isFalse();
    }

    @Test
    void submitReadingScoresAllAnsweredQuestions() {
        List<IeltsQuestion> questions = questions("READING", 3);
        List<IeltsQuestionAnswer> acceptedAnswers = questions.stream()
                .map(question -> acceptedText(question, "TRUE"))
                .toList();
        configureQuestionsAndAcceptedAnswers(questions, acceptedAnswers);
        List<IeltsSubmitRequest.AnswerRequest> answers = questions.stream()
                .map(question -> new IeltsSubmitRequest.AnswerRequest(question.getQuestionId(), " true ", null))
                .toList();

        IeltsResultResponse result = service.submitExam(
                10,
                "user@test.com",
                "READING",
                new IeltsSubmitRequest(answers)
        );

        assertThat(result.getSkill()).isEqualTo("READING");
        assertThat(result.getTotalQuestions()).isEqualTo(3);
        assertThat(result.getAnsweredCount()).isEqualTo(3);
        assertThat(result.getCorrectCount()).isEqualTo(3);
        assertThat(result.getBandScore()).isEqualByComparingTo("2.5");
        assertThat(persistedAnswers).allSatisfy(answer -> {
            assertThat(answer.getSelectedOptionKey()).isEqualTo("TRUE");
            assertThat(answer.getAnswerText()).isNull();
            assertThat(answer.getAnsweredAt()).isNotNull();
            assertThat(answer.getIsCorrect()).isTrue();
        });
    }

    @Test
    void submitKeepsTransactionalBoundaryAndReturnsFriendlyPersistenceError() throws NoSuchMethodException {
        List<IeltsQuestion> questions = questions("LISTENING", 1);
        configureQuestionsAndAcceptedAnswers(questions, List.of());
        when(userAnswerRepository.saveAllAndFlush(anyList()))
                .thenThrow(new DataIntegrityViolationException("chk_ielts_lr_user_answer_value SQL detail"));

        assertThat(IeltsSubmitService.class
                .getMethod("submitExam", Integer.class, String.class, String.class, IeltsSubmitRequest.class)
                .isAnnotationPresent(Transactional.class)).isTrue();
        assertThatThrownBy(() -> service.submitExam(10, "user@test.com", "LISTENING", new IeltsSubmitRequest(List.of())))
                .isInstanceOf(IeltsSubmissionException.class)
                .hasMessage("Không thể lưu bài làm IELTS. Vui lòng thử lại.")
                .hasCauseInstanceOf(DataIntegrityViolationException.class);
    }

    private void configureQuestionsAndAcceptedAnswers(
            List<IeltsQuestion> questions,
            List<IeltsQuestionAnswer> acceptedAnswers
    ) {
        when(questionRepository.findByExamIdAndSkill(anyInt(), anyString())).thenReturn(questions);
        when(questionAnswerRepository.findByQuestion_QuestionIdInOrderByQuestion_QuestionIdAscIdAsc(anyList()))
                .thenReturn(acceptedAnswers);
    }

    private List<IeltsQuestion> questions(String skill, int count) {
        IeltsSectionGroup group = IeltsSectionGroup.builder()
                .id(20)
                .exam(exam)
                .skill(skill)
                .partNo(1)
                .build();
        IeltsQuestionBlock block = IeltsQuestionBlock.builder()
                .id(30)
                .group(group)
                .questionType("TEST")
                .build();

        List<IeltsQuestion> questions = new ArrayList<>();
        for (int index = 1; index <= count; index++) {
            questions.add(IeltsQuestion.builder()
                    .questionId(1000 + index)
                    .exam(exam)
                    .block(block)
                    .questionNo(index)
                    .build());
        }
        return questions;
    }

    private IeltsQuestionAnswer acceptedKey(IeltsQuestion question, String value) {
        return IeltsQuestionAnswer.builder().question(question).answerKey(value).build();
    }

    private IeltsQuestionAnswer acceptedText(IeltsQuestion question, String value) {
        return IeltsQuestionAnswer.builder().question(question).answerText(value).build();
    }
}
