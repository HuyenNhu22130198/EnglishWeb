package com.englishweb.be.flashcard.dto;

import lombok.Data;

@Data
public class FlashcardCardRequest {
    private String term;
    private String pronunciation;
    private String wordType;
    private String meaning;
    private String example;
    private Integer displayOrder;
}
