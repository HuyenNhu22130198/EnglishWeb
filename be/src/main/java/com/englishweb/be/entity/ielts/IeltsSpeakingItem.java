package com.englishweb.be.entity.ielts;

import jakarta.persistence.*;
import lombok.*;

@Data @Entity @Table(name = "ielts_speaking_item")
@NoArgsConstructor @AllArgsConstructor @Builder
public class IeltsSpeakingItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "speak_id", nullable = false)
    private IeltsSpeakingTask speakingTask;
    @Column(name = "content_text", columnDefinition = "TEXT", nullable = false) private String contentText;
    @Column(name = "display_order", nullable = false) private Integer displayOrder;
}
