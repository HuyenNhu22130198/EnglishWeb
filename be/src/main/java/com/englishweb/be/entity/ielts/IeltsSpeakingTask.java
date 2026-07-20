package com.englishweb.be.entity.ielts;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Data @Entity @Table(name = "ielts_speaking_task")
@NoArgsConstructor @AllArgsConstructor @Builder
public class IeltsSpeakingTask {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "exam_id", nullable = false)
    private IeltsExam exam;
    @Column(name = "part_no", nullable = false) private Integer partNo;
    @Column(name = "topic_title") private String topicTitle;
    @Column(name = "instruction_text", columnDefinition = "TEXT") private String instructionText;
    @Column(name = "display_order", nullable = false) private Integer displayOrder;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
}
