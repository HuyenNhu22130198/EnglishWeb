package com.englishweb.be.repository;

import com.englishweb.be.entity.FlashcardDeck;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FlashcardDeckRepository extends JpaRepository<FlashcardDeck, Long> {
    List<FlashcardDeck> findByActiveTrueOrderByDisplayOrderAscIdAsc();
    List<FlashcardDeck> findAllByOrderByDisplayOrderAscIdAsc();
}
