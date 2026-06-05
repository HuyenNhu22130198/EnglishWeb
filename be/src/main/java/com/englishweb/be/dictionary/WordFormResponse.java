package com.englishweb.be.dictionary;

public class WordFormResponse {

    private String word;
    private String code;
    private String vietnameseMeaning;

    public WordFormResponse() {
    }

    public WordFormResponse(String word, String code, String vietnameseMeaning) {
        this.word = word;
        this.code = code;
        this.vietnameseMeaning = vietnameseMeaning;
    }

    public String getWord() {
        return word;
    }

    public String getCode() {
        return code;
    }

    public String getVietnameseMeaning() {
        return vietnameseMeaning;
    }

    public void setWord(String word) {
        this.word = word;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setVietnameseMeaning(String vietnameseMeaning) {
        this.vietnameseMeaning = vietnameseMeaning;
    }
}