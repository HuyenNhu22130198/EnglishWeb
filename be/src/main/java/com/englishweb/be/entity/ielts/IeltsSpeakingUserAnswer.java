package com.englishweb.be.entity.ielts;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @Entity @Table(name = "ielts_speaking_user_answer")
@NoArgsConstructor @AllArgsConstructor @Builder
public class IeltsSpeakingUserAnswer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "attempt_id", nullable = false) private IeltsAttempt attempt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "speaking_task_id", nullable = false) private IeltsSpeakingTask speakingTask;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "speaking_item_id") private IeltsSpeakingItem speakingItem;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "sample_answer_id") private IeltsSpeakingSampleAnswer sampleAnswer;
    @Column(name = "answer_text", columnDefinition = "TEXT") private String answerText;
    @Column(name = "audio_url", columnDefinition = "TEXT") private String audioUrl;
    @Column(name = "duration_seconds") private Integer durationSeconds;
    @Column(name = "band_score") private BigDecimal bandScore;
    @Column(name = "feedback_text", columnDefinition = "TEXT") private String feedbackText;
    @Column(name = "reference_text", columnDefinition = "TEXT") private String referenceText;
    @Column(name = "pronunciation_score", precision = 5, scale = 2) private BigDecimal pronunciationScore;
    @Column(name = "accuracy_score", precision = 5, scale = 2) private BigDecimal accuracyScore;
    @Column(name = "fluency_score", precision = 5, scale = 2) private BigDecimal fluencyScore;
    @Column(name = "completeness_score", precision = 5, scale = 2) private BigDecimal completenessScore;
    @Column(name = "prosody_score", precision = 5, scale = 2) private BigDecimal prosodyScore;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "result_json", columnDefinition = "jsonb") private String resultJson;
    @Column(name = "submitted_at") private LocalDateTime submittedAt;
}
