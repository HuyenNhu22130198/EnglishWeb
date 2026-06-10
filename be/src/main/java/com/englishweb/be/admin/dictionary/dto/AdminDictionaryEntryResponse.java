package com.englishweb.be.admin.dictionary.dto;

import com.englishweb.be.dictionary.DictionaryEntry;

import java.time.LocalDateTime;

public class AdminDictionaryEntryResponse {

    private Long id;
    private String keywordNormalized;
    private String word;
    private String phonetic;
    private String audioUrl;

    private String englishMeaning;
    private String vietnameseMeaning;

    private String synonymsJson;
    private String wordTypesJson;
    private String wordFormsJson;

    private String exampleEn;
    private String exampleVi;

    private String source;
    private String status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AdminDictionaryEntryResponse fromEntity(DictionaryEntry entry) {
        AdminDictionaryEntryResponse response = new AdminDictionaryEntryResponse();

        response.id = entry.getId();
        response.keywordNormalized = entry.getKeywordNormalized();
        response.word = entry.getWord();
        response.phonetic = entry.getPhonetic();
        response.audioUrl = entry.getAudioUrl();

        response.englishMeaning = entry.getEnglishMeaning();
        response.vietnameseMeaning = entry.getVietnameseMeaning();

        response.synonymsJson = entry.getSynonymsJson();
        response.wordTypesJson = entry.getWordTypesJson();
        response.wordFormsJson = entry.getWordFormsJson();

        response.exampleEn = entry.getExampleEn();
        response.exampleVi = entry.getExampleVi();

        response.source = entry.getSource();
        response.status = entry.getStatus();

        response.createdAt = entry.getCreatedAt();
        response.updatedAt = entry.getUpdatedAt();

        return response;
    }

    public Long getId() {
        return id;
    }

    public String getKeywordNormalized() {
        return keywordNormalized;
    }

    public String getWord() {
        return word;
    }

    public String getPhonetic() {
        return phonetic;
    }

    public String getAudioUrl() {
        return audioUrl;
    }

    public String getEnglishMeaning() {
        return englishMeaning;
    }

    public String getVietnameseMeaning() {
        return vietnameseMeaning;
    }

    public String getSynonymsJson() {
        return synonymsJson;
    }

    public String getWordTypesJson() {
        return wordTypesJson;
    }

    public String getWordFormsJson() {
        return wordFormsJson;
    }

    public String getExampleEn() {
        return exampleEn;
    }

    public String getExampleVi() {
        return exampleVi;
    }

    public String getSource() {
        return source;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}