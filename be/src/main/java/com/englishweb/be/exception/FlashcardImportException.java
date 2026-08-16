package com.englishweb.be.exception;

import com.englishweb.be.flashcard.dto.FlashcardImportRowError;

import java.util.List;

public class FlashcardImportException extends RuntimeException {
    private final List<FlashcardImportRowError> errors;

    public FlashcardImportException(List<FlashcardImportRowError> errors) {
        super("File Excel có dữ liệu không hợp lệ.");
        this.errors = List.copyOf(errors);
    }

    public List<FlashcardImportRowError> getErrors() { return errors; }
}
