package com.englishweb.be.exception;

import com.englishweb.be.admin.exam.dto.AdminExamDtos.ImportError;

import java.util.List;

public class ExamImportValidationException extends RuntimeException {
    private final List<ImportError> errors;

    public ExamImportValidationException(List<ImportError> errors) {
        super("File Excel có dữ liệu không hợp lệ.");
        this.errors = List.copyOf(errors);
    }

    public List<ImportError> getErrors() { return errors; }
}
