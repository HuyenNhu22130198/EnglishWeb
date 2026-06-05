package com.englishweb.be.dictionary;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "dictionary_entries")
public class DictionaryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "keyword_normalized", nullable = false, unique = true)
    private String keywordNormalized;

    @Column(nullable = false)
    private String word;

    private String phonetic;

    @Column(name = "audio_url", columnDefinition = "TEXT")
    private String audioUrl;

    @Column(name = "english_meaning", columnDefinition = "TEXT")
    private String englishMeaning;

    @Column(name = "vietnamese_meaning", columnDefinition = "TEXT")
    private String vietnameseMeaning;

    @Column(name = "synonyms_json", columnDefinition = "TEXT")
    private String synonymsJson;

    @Column(name = "word_types_json", columnDefinition = "TEXT")
    private String wordTypesJson;

    @Column(name = "example_en", columnDefinition = "TEXT")
    private String exampleEn;

    @Column(name = "example_vi", columnDefinition = "TEXT")
    private String exampleVi;

    @Column(name = "word_forms_json", columnDefinition = "TEXT")
    private String wordFormsJson;

    @Column(name = "source")
    private String source;

    @Column(name = "status")
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;


    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();

        if (status == null) {
            status = "AUTO_GENERATED";
        }
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getKeywordNormalized() {
        return keywordNormalized;
    }

    public void setKeywordNormalized(String keywordNormalized) {
        this.keywordNormalized = keywordNormalized;
    }

    public String getWord() {
        return word;
    }

    public void setWord(String word) {
        this.word = word;
    }

    public String getPhonetic() {
        return phonetic;
    }

    public void setPhonetic(String phonetic) {
        this.phonetic = phonetic;
    }

    public String getAudioUrl() {
        return audioUrl;
    }

    public void setAudioUrl(String audioUrl) {
        this.audioUrl = audioUrl;
    }

    public String getEnglishMeaning() {
        return englishMeaning;
    }

    public void setEnglishMeaning(String englishMeaning) {
        this.englishMeaning = englishMeaning;
    }

    public String getVietnameseMeaning() {
        return vietnameseMeaning;
    }

    public void setVietnameseMeaning(String vietnameseMeaning) {
        this.vietnameseMeaning = vietnameseMeaning;
    }

    public String getSynonymsJson() {
        return synonymsJson;
    }

    public void setSynonymsJson(String synonymsJson) {
        this.synonymsJson = synonymsJson;
    }

    public String getExampleEn() {
        return exampleEn;
    }

    public void setExampleEn(String exampleEn) {
        this.exampleEn = exampleEn;
    }

    public String getExampleVi() {
        return exampleVi;
    }

    public void setExampleVi(String exampleVi) {
        this.exampleVi = exampleVi;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getWordTypesJson() {
    return wordTypesJson;
    }

    public void setWordTypesJson(String wordTypesJson) {
        this.wordTypesJson = wordTypesJson;
    }

    public String getWordFormsJson() {
        return wordFormsJson;
    }

    public void setWordFormsJson(String wordFormsJson) {
        this.wordFormsJson = wordFormsJson;
    }
}