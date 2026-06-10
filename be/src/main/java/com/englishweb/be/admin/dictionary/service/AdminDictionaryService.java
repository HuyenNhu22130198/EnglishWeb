package com.englishweb.be.admin.dictionary.service;

import com.englishweb.be.admin.dictionary.dto.AdminDictionaryEntryResponse;
import com.englishweb.be.admin.dictionary.dto.AdminDictionaryGenerateRequest;
import com.englishweb.be.admin.dictionary.dto.AdminDictionaryUpdateRequest;
import com.englishweb.be.dictionary.DictionaryEntry;
import com.englishweb.be.dictionary.DictionaryEntryRepository;
import com.englishweb.be.dictionary.DictionaryService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class AdminDictionaryService {

    private final DictionaryEntryRepository repository;
    private final DictionaryService dictionaryService;

    public AdminDictionaryService(
            DictionaryEntryRepository repository,
            DictionaryService dictionaryService
    ) {
        this.repository = repository;
        this.dictionaryService = dictionaryService;
    }

    public Page<AdminDictionaryEntryResponse> getEntries(
            String keyword,
            int page,
            int size
    ) {
        PageRequest pageRequest = PageRequest.of(
                Math.max(page, 0),
                Math.max(size, 1),
                Sort.by(Sort.Direction.DESC, "id")
        );

        String searchKeyword = safe(keyword).trim();

        Page<DictionaryEntry> entries;

        if (searchKeyword.isBlank()) {
            entries = repository.findAll(pageRequest);
        } else {
            entries = repository.findByKeywordNormalizedContainingIgnoreCaseOrWordContainingIgnoreCase(
                    searchKeyword,
                    searchKeyword,
                    pageRequest
            );
        }

        return entries.map(AdminDictionaryEntryResponse::fromEntity);
    }

    public AdminDictionaryEntryResponse getEntry(Long id) {
        DictionaryEntry entry = findById(id);
        return AdminDictionaryEntryResponse.fromEntity(entry);
    }

    public AdminDictionaryEntryResponse generateEntry(AdminDictionaryGenerateRequest request) {
        String keyword = normalizeKeyword(request.getKeyword());

        if (keyword.isBlank()) {
            throw new RuntimeException("Vui lòng nhập từ cần generate.");
        }

        dictionaryService.search(keyword);

        DictionaryEntry entry = repository.findByKeywordNormalized(keyword)
                .orElseThrow(() -> new RuntimeException("Generate dữ liệu từ vựng thất bại."));

        return AdminDictionaryEntryResponse.fromEntity(entry);
    }

    public AdminDictionaryEntryResponse updateEntry(
            Long id,
            AdminDictionaryUpdateRequest request
    ) {
        DictionaryEntry entry = findById(id);

        String keywordNormalized = normalizeKeyword(request.getKeywordNormalized());

        if (keywordNormalized.isBlank()) {
            keywordNormalized = normalizeKeyword(request.getWord());
        }

        if (keywordNormalized.isBlank()) {
            throw new RuntimeException("keyword_normalized không được để trống.");
        }

        if (repository.existsByKeywordNormalizedAndIdNot(keywordNormalized, id)) {
            throw new RuntimeException("keyword_normalized đã tồn tại.");
        }

        entry.setKeywordNormalized(keywordNormalized);
        entry.setWord(safe(request.getWord()));
        entry.setPhonetic(safe(request.getPhonetic()));
        entry.setAudioUrl(safe(request.getAudioUrl()));

        entry.setEnglishMeaning(safe(request.getEnglishMeaning()));
        entry.setVietnameseMeaning(safe(request.getVietnameseMeaning()));

        entry.setSynonymsJson(defaultJsonArray(request.getSynonymsJson()));
        entry.setWordTypesJson(defaultJsonArray(request.getWordTypesJson()));
        entry.setWordFormsJson(defaultJsonArray(request.getWordFormsJson()));

        entry.setExampleEn(safe(request.getExampleEn()));
        entry.setExampleVi(safe(request.getExampleVi()));

        entry.setSource(safe(request.getSource()));
        entry.setStatus(safe(request.getStatus()).isBlank() ? "REVIEWED" : request.getStatus());

        DictionaryEntry saved = repository.save(entry);

        return AdminDictionaryEntryResponse.fromEntity(saved);
    }

    public void deleteEntry(Long id) {
        DictionaryEntry entry = findById(id);
        repository.delete(entry);
    }

    private DictionaryEntry findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy từ vựng id = " + id));
    }

    private String normalizeKeyword(String value) {
        return safe(value).trim().toLowerCase();
    }

    private String defaultJsonArray(String value) {
        if (value == null || value.trim().isBlank()) {
            return "[]";
        }

        return value.trim();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}