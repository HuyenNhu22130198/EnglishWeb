package com.englishweb.be.entity.toeic;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Entity
@Table(name = "toeic_question_option")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ToeicQuestionOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer optionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private ToeicQuestion question;

    @Column(nullable = false, length = 1)
    private String optionLabel;

    @Column(columnDefinition = "TEXT")
    private String optionText;

    @Column(nullable = false)
    private Integer displayOrder;
}
