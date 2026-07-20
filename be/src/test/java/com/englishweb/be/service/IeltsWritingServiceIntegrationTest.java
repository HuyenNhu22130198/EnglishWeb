package com.englishweb.be.service;

import com.englishweb.be.dto.ielts.IeltsSubmitRequest;
import com.englishweb.be.dto.ielts.IeltsWritingSubmitResponse;
import com.englishweb.be.controller.IeltsExamController;
import com.englishweb.be.exception.GlobalExceptionHandler;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=none")
@Transactional
@Rollback
class IeltsWritingServiceIntegrationTest {

    @Autowired private IeltsWritingService writingService;
    @Autowired private IeltsPracticeService practiceService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManager entityManager;
    @Autowired private IeltsExamController ieltsExamController;
    @Autowired private GlobalExceptionHandler globalExceptionHandler;
    private MockMvc mockMvc;

    private Integer examId;
    private String email;
    private List<Map<String, Object>> tasks;

    @BeforeEach
    void loadSeededWritingExam() {
        mockMvc = MockMvcBuilders.standaloneSetup(ieltsExamController)
                .setControllerAdvice(globalExceptionHandler)
                .build();
        examId = jdbcTemplate.queryForObject("""
                select exam_id
                from ielts_writing_task
                group by exam_id
                having count(*) >= 2
                order by exam_id
                limit 1
                """, Integer.class);
        email = jdbcTemplate.queryForObject("select email from users order by id limit 1", String.class);
        tasks = jdbcTemplate.queryForList(
                "select id, task_no from ielts_writing_task where exam_id = ? order by task_no limit 2",
                examId
        );
    }

    @Test
    void submitsBothTasksAndPersistsTwoAnswers() {
        IeltsWritingSubmitResponse response = submit("Task one complete answer.", "Task two complete answer.");

        List<Map<String, Object>> answers = savedAnswers(response.getAttemptId());
        assertThat(answers).hasSize(2);
        assertThat(answers).allSatisfy(answer -> {
            assertThat((Integer) answer.get("word_count")).isPositive();
            assertSimilarityInRange((BigDecimal) answer.get("similarity_percent"));
        });
    }

    @Test
    void loadsWritingPracticeDirectlyFromWritingTasks() {
        var practice = practiceService.getPracticeExam(examId, "WRITING");

        assertThat(practice.getWritingTasks()).hasSizeGreaterThanOrEqualTo(2);
        assertThat(practice.getWritingTasks()).allSatisfy(task -> {
            assertThat(task.getTaskId()).isNotNull();
            assertThat(task.getTaskNo()).isIn(1, 2);
            assertThat(task.getPrompt()).isNotBlank();
            assertThat(task.getInstruction()).isNotBlank();
        });
        assertThat(practice.getGroups()).isEmpty();
    }

    @Test
    void resultCanBeReloadedByAttemptId() {
        IeltsWritingSubmitResponse response = submit("Task one complete answer.", "Task two complete answer.");

        var result = writingService.getResult(response.getAttemptId(), email);

        assertThat(result.getAttemptId()).isEqualTo(response.getAttemptId());
        assertThat(result.getSkill()).isEqualTo("WRITING");
        assertThat(result.getTasks()).hasSize(2);
    }

    @Test
    void writingSubmitEndpointAcceptsTasksPayloadAndReturnsAttemptId() throws Exception {
        String payload = """
                {
                  "elapsedSeconds": 12,
                  "tasks": [
                    {"taskId": %d, "taskNo": 1, "answerText": "Task one answer."},
                    {"taskId": %d, "taskNo": 2, "answerText": "Task two answer."}
                  ]
                }
                """.formatted(tasks.get(0).get("id"), tasks.get(1).get("id"));

        mockMvc.perform(post("/api/ielts/exams/{examId}/submit", examId)
                        .queryParam("skill", "WRITING")
                        .contentType("application/json")
                        .content(payload)
                        .principal(new UsernamePasswordAuthenticationToken(email, null, List.of())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.attemptId").isNumber());
    }

    @Test
    void permitsOneTaskToBeBlank() {
        IeltsWritingSubmitResponse response = submit("Only task one is answered.", "");

        List<Map<String, Object>> answers = savedAnswers(response.getAttemptId());
        assertThat(answers).hasSize(2);
        assertThat(answers.get(1).get("answer_text")).isEqualTo("");
        assertThat(answers.get(1).get("word_count")).isEqualTo(0);
        assertThat(answers.get(1).get("matched_word_count")).isEqualTo(0);
        assertThat((BigDecimal) answers.get(1).get("similarity_percent")).isEqualByComparingTo("0.00");
    }

    @Test
    void permitsTaskOneToBeBlank() {
        IeltsWritingSubmitResponse response = submit("", "Only task two is answered.");

        List<Map<String, Object>> answers = savedAnswers(response.getAttemptId());
        assertThat(answers).hasSize(2);
        assertThat(answers.get(0).get("answer_text")).isEqualTo("");
        assertThat(answers.get(0).get("word_count")).isEqualTo(0);
        assertThat(answers.get(1).get("word_count")).isEqualTo(5);
    }

    @Test
    void permitsBothTasksToBeBlank() {
        IeltsWritingSubmitResponse response = submit("", "");

        List<Map<String, Object>> answers = savedAnswers(response.getAttemptId());
        assertThat(answers).hasSize(2);
        assertThat(answers).allSatisfy(answer -> {
            assertThat(answer.get("answer_text")).isEqualTo("");
            assertThat(answer.get("word_count")).isEqualTo(0);
            assertThat(answer.get("matched_word_count")).isEqualTo(0);
            assertThat((BigDecimal) answer.get("similarity_percent")).isEqualByComparingTo("0.00");
        });
    }

    @Test
    void submitsWhenOneTaskHasNoSampleAnswer() {
        Integer taskId = (Integer) tasks.get(1).get("id");
        jdbcTemplate.update("delete from ielts_writing_sample_answer where task_id = ?", taskId);
        entityManager.clear();

        IeltsWritingSubmitResponse response = submit("Task one.", "Task two without sample.");

        Map<String, Object> taskTwoAnswer = savedAnswers(response.getAttemptId()).get(1);
        assertThat(taskTwoAnswer.get("sample_answer_id")).isNull();
        assertThat(taskTwoAnswer.get("matched_word_count")).isEqualTo(0);
        assertThat((BigDecimal) taskTwoAnswer.get("similarity_percent")).isEqualByComparingTo("0.00");
    }

    private IeltsWritingSubmitResponse submit(String taskOneAnswer, String taskTwoAnswer) {
        IeltsSubmitRequest request = new IeltsSubmitRequest();
        request.setElapsedSeconds(12);
        request.setTasks(List.of(
                answerRequest(tasks.get(0), taskOneAnswer),
                answerRequest(tasks.get(1), taskTwoAnswer)
        ));
        return writingService.submit(examId, email, request);
    }

    private IeltsSubmitRequest.WritingAnswerRequest answerRequest(Map<String, Object> task, String answerText) {
        return new IeltsSubmitRequest.WritingAnswerRequest(
                (Integer) task.get("id"),
                (Integer) task.get("task_no"),
                answerText
        );
    }

    private List<Map<String, Object>> savedAnswers(Integer attemptId) {
        return jdbcTemplate.queryForList("""
                select answer_text, word_count, sample_answer_id, matched_word_count, similarity_percent
                from ielts_writing_user_answer
                where attempt_id = ?
                order by task_id
                """, attemptId);
    }

    private void assertSimilarityInRange(BigDecimal similarity) {
        assertThat(similarity).isBetween(BigDecimal.ZERO, BigDecimal.valueOf(100));
    }
}
