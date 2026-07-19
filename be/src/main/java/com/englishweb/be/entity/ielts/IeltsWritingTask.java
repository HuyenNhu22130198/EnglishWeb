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
@Table(name = "ielts_writing_task")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IeltsWritingTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private IeltsExam exam;

    @Column(name = "task_no", nullable = false)
    private Integer taskNo;

    @Column(name = "task_type", nullable = false)
    private String taskType;

    @Column(name = "instruction_text", columnDefinition = "TEXT", nullable = false)
    private String instructionText;

    @Column(name = "prompt_text", columnDefinition = "TEXT", nullable = false)
    private String promptText;

    @Column(name = "min_words", nullable = false)
    private Integer minWords;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;
}
