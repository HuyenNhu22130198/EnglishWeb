package com.englishweb.be.entity.ielts;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Data @Entity @Table(name = "ielts_speaking_sample_answer")
@NoArgsConstructor @AllArgsConstructor @Builder
public class IeltsSpeakingSampleAnswer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "speaking_task_id", nullable = false)
    private IeltsSpeakingTask speakingTask;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "speaking_item_id")
    private IeltsSpeakingItem speakingItem;
    @Column(name = "segment_no", nullable = false) private Integer segmentNo;
    @Column(name = "segment_title") private String segmentTitle;
    @Column(name = "answer_text", columnDefinition = "TEXT", nullable = false) private String answerText;
    @Column(name = "source_type", nullable = false) private String sourceType;
    @Column(name = "voice_locale", nullable = false) private String voiceLocale;
    @Column(name = "display_order", nullable = false) private Integer displayOrder;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
}
