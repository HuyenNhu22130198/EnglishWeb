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

@Data
@Entity
@Table(name = "ielts_media_asset")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IeltsMediaAsset {

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

    @Column(name = "asset_type", length = 50)
    private String assetType;

    @Column(name = "asset_url", columnDefinition = "TEXT")
    private String assetUrl;

    @Column(name = "display_order")
    private Integer displayOrder;
}
