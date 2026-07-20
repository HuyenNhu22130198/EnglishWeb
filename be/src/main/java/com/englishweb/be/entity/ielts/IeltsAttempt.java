package com.englishweb.be.entity.ielts;

import com.englishweb.be.entity.User;
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
@Table(name = "ielts_attempt")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IeltsAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private IeltsExam exam;

    @Column(name = "attempt_type", length = 30)
    private String attemptType;

    @Column(length = 30)
    private String skill;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "listening_correct_count")
    private Integer listeningCorrectCount;

    @Column(name = "reading_correct_count")
    private Integer readingCorrectCount;

    @Column(name = "listening_band", precision = 3, scale = 1)
    private BigDecimal listeningBand;

    @Column(name = "reading_band", precision = 3, scale = 1)
    private BigDecimal readingBand;

    @Column(name = "writing_band", precision = 3, scale = 1)
    private BigDecimal writingBand;

    @Column(name = "speaking_band", precision = 3, scale = 1)
    private BigDecimal speakingBand;

    @Column(name = "overall_band", precision = 3, scale = 1)
    private BigDecimal overallBand;

    @Column(length = 20)
    @Builder.Default
    private String status = "SUBMITTED";

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
