package com.englishweb.be.entity.ielts;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "ielts_speaking_free_answer")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IeltsSpeakingFreeAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private IeltsAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "speaking_task_id", nullable = false)
    private IeltsSpeakingTask speakingTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "speaking_item_id", nullable = false)
    private IeltsSpeakingItem speakingItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sample_answer_id")
    private IeltsSpeakingSampleAnswer sampleAnswer;

    @Column(name = "question_text", columnDefinition = "TEXT", nullable = false)
    private String questionText;

    @Column(name = "audio_url", columnDefinition = "TEXT", nullable = false)
    private String audioUrl;

    @Column(name = "audio_public_id", nullable = false)
    private String audioPublicId;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "whisper_transcript_text", columnDefinition = "TEXT")
    private String whisperTranscriptText;

    @Column(name = "transcript_text", columnDefinition = "TEXT")
    private String transcriptText;

    @Column(name = "whisper_status", length = 20, nullable = false)
    private String whisperStatus;

    @Column(name = "whisper_error", columnDefinition = "TEXT")
    private String whisperError;

    @Column(name = "status", length = 20, nullable = false)
    private String status;

    @Column(name = "relevance_score", precision = 3, scale = 1)
    private BigDecimal relevanceScore;

    @Column(name = "idea_development_score", precision = 3, scale = 1)
    private BigDecimal ideaDevelopmentScore;

    @Column(name = "grammar_score", precision = 3, scale = 1)
    private BigDecimal grammarScore;

    @Column(name = "vocabulary_score", precision = 3, scale = 1)
    private BigDecimal vocabularyScore;

    @Column(name = "coherence_score", precision = 3, scale = 1)
    private BigDecimal coherenceScore;

    @Column(name = "overall_band_estimate", precision = 3, scale = 1)
    private BigDecimal overallBandEstimate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "errors_json", columnDefinition = "jsonb")
    private String errorsJson;

    @Column(name = "corrected_answer_text", columnDefinition = "TEXT")
    private String correctedAnswerText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "gemini_raw_json", columnDefinition = "jsonb")
    private String geminiRawJson;

    @Column(name = "gemini_status", length = 20)
    private String geminiStatus;

    @Column(name = "gemini_error", columnDefinition = "TEXT")
    private String geminiError;

    @Column(name = "transcribed_at", nullable = false)
    private LocalDateTime transcribedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;
}
