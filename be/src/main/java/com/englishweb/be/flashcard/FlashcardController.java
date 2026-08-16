package com.englishweb.be.flashcard;

import com.englishweb.be.flashcard.dto.FlashcardCardResponse;
import com.englishweb.be.flashcard.dto.FlashcardDeckResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/flashcards")
public class FlashcardController {

    private final FlashcardService flashcardService;

    public FlashcardController(FlashcardService flashcardService) {
        this.flashcardService = flashcardService;
    }

    @GetMapping("/decks")
    public List<FlashcardDeckResponse> getDecks() {
        return flashcardService.getPublicDecks();
    }

    @GetMapping("/decks/{id}/cards")
    public List<FlashcardCardResponse> getDeckCards(@PathVariable Long id) {
        return flashcardService.getPublicDeckCards(id);
    }
}
