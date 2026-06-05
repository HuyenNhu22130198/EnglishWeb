package com.englishweb.be.dictionary;

public class WordTypeResponse {

    private String code;
    private String englishName;
    private String vietnameseName;
    private String label;
    private String englishMeaning;
    private String vietnameseMeaning;

    public WordTypeResponse() {
    }

    public WordTypeResponse(
            String code,
            String englishName,
            String vietnameseName,
            String label,
            String englishMeaning,
            String vietnameseMeaning
    ) {
        this.code = code;
        this.englishName = englishName;
        this.vietnameseName = vietnameseName;
        this.label = label;
        this.englishMeaning = englishMeaning;
        this.vietnameseMeaning = vietnameseMeaning;
    }

    public String getCode() {
        return code;
    }

    public String getEnglishName() {
        return englishName;
    }

    public String getVietnameseName() {
        return vietnameseName;
    }

    public String getLabel() {
        return label;
    }

    public String getEnglishMeaning() {
        return englishMeaning;
    }

    public String getVietnameseMeaning() {
        return vietnameseMeaning;
    }
}