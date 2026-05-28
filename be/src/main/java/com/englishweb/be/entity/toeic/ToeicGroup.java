package com.englishweb.be.entity.toeic;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "toeic_group")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ToeicGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private ToeicExam exam;

    @Column(nullable = false, length = 10)
    private String section;

    @Column(nullable = false)
    private Integer partNo;

    @Column(nullable = false)
    private Integer groupNo;

    @Column(nullable = false, length = 30)
    private String groupType;

    @Column(length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String instructionText;

    @Column(columnDefinition = "TEXT")
    private String sharedText;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
