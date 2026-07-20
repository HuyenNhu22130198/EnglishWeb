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
@Table(name = "ielts_question_block")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IeltsQuestionBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private IeltsSectionGroup group;

    @Column(name = "block_no")
    private Integer blockNo;

    @Column(name = "question_type", length = 100)
    private String questionType;

    @Column(name = "instruction_text", columnDefinition = "TEXT")
    private String instructionText;

    @Column(name = "max_answers")
    private Integer maxAnswers;

    @Column(name = "answer_format", length = 50)
    private String answerFormat;

    @Column(name = "display_order")
    private Integer displayOrder;
}
