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
@Table(name = "ielts_question_option")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IeltsQuestionOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private IeltsQuestion question;

    @Column(name = "option_key", length = 20)
    private String optionKey;

    @Column(name = "option_text", columnDefinition = "TEXT")
    private String optionText;

    @Column(name = "display_order")
    private Integer displayOrder;
}
