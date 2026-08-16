package com.englishweb.be.flashcard.dto;

import com.englishweb.be.entity.FlashcardCard;

import java.time.LocalDateTime;

public record FlashcardCardResponse(
        Long id,
        Long deckId,
        String term,
        String pronunciation,
        String wordType,
        String meaning,
        String example,
        Integer displayOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static FlashcardCardResponse fromEntity(FlashcardCard card) {
        return new FlashcardCardResponse(
                card.getId(),
                card.getDeck().getId(),
                card.getTerm(),
                card.getPronunciation(),
                card.getWordType(),
                card.getMeaning(),
                card.getExample(),
                card.getDisplayOrder(),
                card.getCreatedAt(),
                card.getUpdatedAt()
        );
    }
}
