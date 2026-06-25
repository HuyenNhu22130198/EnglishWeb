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
@Table(name = "ielts_section_group")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IeltsSectionGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private IeltsExam exam;

    @Column(length = 30)
    private String skill;

    @Column(name = "part_no")
    private Integer partNo;

    @Column(name = "group_no")
    private Integer groupNo;

    @Column(length = 255)
    private String title;

    @Column(name = "instruction_text", columnDefinition = "TEXT")
    private String instructionText;

    @Column(name = "shared_text", columnDefinition = "TEXT")
    private String sharedText;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "main_asset_id")
    private IeltsMediaAsset mainAsset;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
