package com.englishweb.be.admin.flashcard;

import com.englishweb.be.flashcard.FlashcardService;
import com.englishweb.be.flashcard.dto.FlashcardCardRequest;
import com.englishweb.be.flashcard.dto.FlashcardCardResponse;
import com.englishweb.be.flashcard.dto.FlashcardDeckRequest;
import com.englishweb.be.flashcard.dto.FlashcardDeckResponse;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/admin/flashcards")
@PreAuthorize("hasRole('ADMIN')")
public class AdminFlashcardController {

    private final FlashcardService flashcardService;

    public AdminFlashcardController(FlashcardService flashcardService) {
        this.flashcardService = flashcardService;
    }

    @GetMapping("/decks")
    public List<FlashcardDeckResponse> getDecks() {
        return flashcardService.getAllDecks();
    }

    @PostMapping("/decks")
    public FlashcardDeckResponse createDeck(@RequestBody FlashcardDeckRequest request) {
        return flashcardService.createDeck(request);
    }

    @PutMapping("/decks/{id}")
    public FlashcardDeckResponse updateDeck(@PathVariable Long id, @RequestBody FlashcardDeckRequest request) {
        return flashcardService.updateDeck(id, request);
    }

    @DeleteMapping("/decks/{id}")
    public void deleteDeck(@PathVariable Long id) {
        flashcardService.deleteDeck(id);
    }

    @GetMapping("/decks/{id}/cards")
    public List<FlashcardCardResponse> getDeckCards(@PathVariable Long id) {
        return flashcardService.getDeckCardsAdmin(id);
    }

    @PostMapping("/decks/{id}/cards")
    public FlashcardCardResponse createCard(@PathVariable Long id, @RequestBody FlashcardCardRequest request) {
        return flashcardService.createCard(id, request);
    }

    @PutMapping("/cards/{cardId}")
    public FlashcardCardResponse updateCard(@PathVariable Long cardId, @RequestBody FlashcardCardRequest request) {
        return flashcardService.updateCard(cardId, request);
    }

    @DeleteMapping("/cards/{cardId}")
    public void deleteCard(@PathVariable Long cardId) {
        flashcardService.deleteCard(cardId);
    }

    @GetMapping("/import-template")
    public ResponseEntity<byte[]> downloadImportTemplate() {
        byte[] content = flashcardService.generateCardImportTemplate();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("flashcard-import-template.xlsx", StandardCharsets.UTF_8).build().toString())
                .contentLength(content.length)
                .body(content);
    }

    @PostMapping(value = "/decks/{id}/cards/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<FlashcardCardResponse> importCards(@PathVariable Long id, @RequestParam MultipartFile file) {
        return flashcardService.importCards(id, file);
    }
}
