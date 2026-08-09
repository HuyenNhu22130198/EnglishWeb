package com.englishweb.be.entity.ielts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "ielts_writing_user_answer")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IeltsWritingUserAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private IeltsAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private IeltsWritingTask task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sample_answer_id")
    private IeltsWritingSampleAnswer sampleAnswer;

    @Column(name = "answer_text", columnDefinition = "TEXT", nullable = false)
    private String answerText;

    @Column(name = "word_count", nullable = false)
    private Integer wordCount;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    // AI grading (Gemini) fields — populated by a separate "grade" step, not by submit().
    @Column(name = "gemini_status")
    private String geminiStatus;

    @Column(name = "gemini_error", columnDefinition = "TEXT")
    private String geminiError;

    @Column(name = "topic_relevance")
    private String topicRelevance;

    @Column(name = "answers_question")
    private Boolean answersQuestion;

    @Column(name = "task_response_percent")
    private Integer taskResponsePercent;

    @Column(name = "coherence_percent")
    private Integer coherencePercent;

    @Column(name = "vocabulary_percent")
    private Integer vocabularyPercent;

    @Column(name = "grammar_percent")
    private Integer grammarPercent;

    @Column(name = "overall_quality_percent")
    private Integer overallQualityPercent;

    @Column(name = "gemini_summary", columnDefinition = "TEXT")
    private String geminiSummary;

    @Column(name = "task_requirements_json", columnDefinition = "TEXT")
    private String taskRequirementsJson;

    @Column(name = "strengths_json", columnDefinition = "TEXT")
    private String strengthsJson;

    @Column(name = "errors_json", columnDefinition = "TEXT")
    private String errorsJson;

    @Column(name = "corrected_answer_text", columnDefinition = "TEXT")
    private String correctedAnswerText;

    @Column(name = "gemini_raw_json", columnDefinition = "TEXT")
    private String geminiRawJson;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
