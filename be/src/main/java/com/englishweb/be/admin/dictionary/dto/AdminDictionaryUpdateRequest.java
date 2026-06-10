package com.englishweb.be.admin.dictionary.dto;

public class AdminDictionaryUpdateRequest {

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
}