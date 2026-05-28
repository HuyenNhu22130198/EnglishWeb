package com.englishweb.be.entity.toeic;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Entity
@Table(name = "toeic_group_material")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ToeicGroupMaterial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private ToeicGroup group;

    @Column(nullable = false, length = 30)
    private String materialType;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String assetUrl;

    @Column(nullable = false)
    @Builder.Default
    private Integer displayOrder = 1;
}
