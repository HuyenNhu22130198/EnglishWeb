package com.englishweb.be.repository;

import com.englishweb.be.entity.FlashcardCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FlashcardCardRepository extends JpaRepository<FlashcardCard, Long> {
    List<FlashcardCard> findByDeckIdOrderByDisplayOrderAscIdAsc(Long deckId);
    long countByDeckId(Long deckId);
}
