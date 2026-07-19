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

import java.math.BigDecimal;
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

    @Column(name = "matched_word_count", nullable = false)
    private Integer matchedWordCount;

    @Column(name = "similarity_percent", precision = 5, scale = 2, nullable = false)
    private BigDecimal similarityPercent;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
