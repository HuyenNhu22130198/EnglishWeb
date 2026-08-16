package com.englishweb.be.flashcard.dto;

import lombok.Data;

@Data
public class FlashcardDeckRequest {
    private String name;
    private String description;
    private String level;
    private Integer displayOrder;
    private Boolean active;
}
