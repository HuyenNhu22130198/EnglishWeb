package com.englishweb.be.dictionary;

import java.util.List;

public class DictionaryResponse {

    private String word;
    private String phonetic;
    private String audioUrl;

    private String vietnameseMeaning;
    private String englishMeaning;

    private List<String> synonyms;
    private List<WordTypeResponse> wordTypes;
    private List<WordFormResponse> wordForms;

    private String exampleEn;
    private String exampleVi;

    private String source;

    public DictionaryResponse() {
    }

    public DictionaryResponse(
            String word,
            String phonetic,
            String audioUrl,
            String vietnameseMeaning,
            String englishMeaning,
            List<String> synonyms,
            List<WordTypeResponse> wordTypes,
            List<WordFormResponse> wordForms,
            String exampleEn,
            String exampleVi,
            String source
    ) {
        this.word = word;
        this.phonetic = phonetic;
        this.audioUrl = audioUrl;
        this.vietnameseMeaning = vietnameseMeaning;
        this.englishMeaning = englishMeaning;
        this.synonyms = synonyms;
        this.wordTypes = wordTypes;
        this.wordForms = wordForms;
        this.exampleEn = exampleEn;
        this.exampleVi = exampleVi;
        this.source = source;
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

    public String getVietnameseMeaning() {
        return vietnameseMeaning;
    }

    public String getEnglishMeaning() {
        return englishMeaning;
    }

    public List<String> getSynonyms() {
        return synonyms;
    }

    public List<WordTypeResponse> getWordTypes() {
        return wordTypes;
    }

    public List<WordFormResponse> getWordForms() {
        return wordForms;
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
}