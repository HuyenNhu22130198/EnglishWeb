package com.englishweb.be.flashcard.dto;

import com.englishweb.be.entity.FlashcardDeck;

import java.time.LocalDateTime;

public record FlashcardDeckResponse(
        Long id,
        String name,
        String description,
        String level,
        Integer displayOrder,
        Boolean active,
        long cardCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static FlashcardDeckResponse fromEntity(FlashcardDeck deck, long cardCount) {
        return new FlashcardDeckResponse(
                deck.getId(),
                deck.getName(),
                deck.getDescription(),
                deck.getLevel(),
                deck.getDisplayOrder(),
                deck.getActive(),
                cardCount,
                deck.getCreatedAt(),
                deck.getUpdatedAt()
        );
    }
}
