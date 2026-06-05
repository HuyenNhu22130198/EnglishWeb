package com.englishweb.be.dictionary;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class DictionaryService {

    private final DictionaryEntryRepository repository;
    private final RestClient restClient;
    private final JsonMapper jsonMapper;

    public DictionaryService(DictionaryEntryRepository repository) {
        this.repository = repository;
        this.restClient = RestClient.builder().build();
        this.jsonMapper = JsonMapper.builder().build();
    }

    public DictionaryResponse search(String keyword) {
        String normalizedKeyword = normalizeKeyword(keyword);

        if (normalizedKeyword.isBlank()) {
            throw new RuntimeException("Vui lòng nhập từ hoặc cụm từ cần tra cứu.");
        }

        Optional<DictionaryEntry> cachedEntry =
                repository.findByKeywordNormalized(normalizedKeyword);

        if (cachedEntry.isPresent()) {
            return mapEntityToResponse(cachedEntry.get());
        }

        DictionaryEntry newEntry = fetchAndSaveDictionaryEntry(normalizedKeyword);

        return mapEntityToResponse(newEntry);
    }

    private DictionaryEntry fetchAndSaveDictionaryEntry(String keyword) {
        DictionaryEntry entry = new DictionaryEntry();

        entry.setKeywordNormalized(keyword);
        entry.setWord(keyword);
        entry.setSource("EXTERNAL_API");
        entry.setStatus("AUTO_GENERATED");
        entry.setSynonymsJson("[]");
        entry.setWordTypesJson("[]");
        entry.setWordFormsJson("[]");

        boolean foundFromDictionaryApi = fetchFromDictionaryApi(keyword, entry);

        if (!foundFromDictionaryApi) {
            fetchFromDatamuse(keyword, entry);
        }

        if (isBlank(entry.getEnglishMeaning())) {
            throw new RuntimeException("Không tìm thấy nghĩa tiếng Anh cho từ: " + keyword);
        }

        if (isBlank(entry.getVietnameseMeaning())) {
            entry.setVietnameseMeaning(translateToVietnamese(entry.getWord()));
        }

        if (!isBlank(entry.getExampleEn()) && isBlank(entry.getExampleVi())) {
            entry.setExampleVi(translateToVietnamese(entry.getExampleEn()));
        }

        return repository.save(entry);
    }

    private boolean fetchFromDictionaryApi(String keyword, DictionaryEntry entry) {
        try {
            JsonNode payload = restClient.get()
                    .uri("https://api.dictionaryapi.dev/api/v2/entries/en/{word}", keyword)
                    .retrieve()
                    .body(JsonNode.class);

            if (payload == null || !payload.isArray() || payload.size() == 0) {
                return false;
            }

            JsonNode firstItem = payload.get(0);

            String word = getText(firstItem, "word");
            String phonetic = getText(firstItem, "phonetic");

            if (!isBlank(word)) {
                entry.setWord(word);
            }

            if (!isBlank(phonetic)) {
                entry.setPhonetic(phonetic);
            }

            JsonNode phonetics = firstItem.path("phonetics");
            String audioUrl = "";
            String phoneticText = "";

            if (phonetics.isArray()) {
                for (JsonNode phoneticItem : phonetics) {
                    String currentText = getText(phoneticItem, "text");
                    String currentAudio = normalizeAudioUrl(getText(phoneticItem, "audio"));

                    if (isBlank(phoneticText) && !isBlank(currentText)) {
                        phoneticText = currentText;
                    }

                    if (isBlank(audioUrl) && !isBlank(currentAudio)) {
                        audioUrl = currentAudio;
                    }

                    if (!isBlank(phoneticText) && !isBlank(audioUrl)) {
                        break;
                    }
                }
            }

            if (isBlank(entry.getPhonetic())) {
                entry.setPhonetic(phoneticText);
            }

            entry.setAudioUrl(audioUrl);

            JsonNode meanings = firstItem.path("meanings");

            String englishMeaning = "";
            String exampleEn = "";
            Set<String> synonyms = new LinkedHashSet<>();
            List<WordTypeResponse> wordTypes = new ArrayList<>();

            if (meanings.isArray()) {
                for (JsonNode meaning : meanings) {
                    String partOfSpeech = getText(meaning, "partOfSpeech");
                    JsonNode definitions = meaning.path("definitions");

                    String typeEnglishMeaning = "";
                    String typeVietnameseMeaning = "";

                    if (definitions.isArray()) {
                        for (JsonNode definitionItem : definitions) {
                            String definition = getText(definitionItem, "definition");
                            String example = getText(definitionItem, "example");

                            if (isBlank(englishMeaning) && !isBlank(definition)) {
                                englishMeaning = definition;
                            }

                            if (isBlank(typeEnglishMeaning) && !isBlank(definition)) {
                                typeEnglishMeaning = definition;
                                typeVietnameseMeaning = translateToVietnamese(definition);
                            }

                            if (isBlank(exampleEn) && !isBlank(example)) {
                                exampleEn = example;
                            }

                            JsonNode synonymNodes = definitionItem.path("synonyms");

                            if (synonymNodes.isArray()) {
                                for (JsonNode synonymNode : synonymNodes) {
                                    String synonym = synonymNode.asText("");

                                    if (!isBlank(synonym)) {
                                        synonyms.add(synonym);
                                    }
                                }
                            }
                        }
                    }

                    if (!isBlank(partOfSpeech)) {
                        wordTypes.add(buildWordTypeResponse(
                                partOfSpeech,
                                typeEnglishMeaning,
                                typeVietnameseMeaning
                        ));
                    }
                }
            }

            entry.setEnglishMeaning(englishMeaning);

            // Ô "Nghĩa tiếng Việt" chính sẽ dịch từ/cụm từ đang tra,
            entry.setVietnameseMeaning(translateToVietnamese(entry.getWord()));

            entry.setExampleEn(exampleEn);
            entry.setExampleVi(translateToVietnamese(exampleEn));

            if (synonyms.isEmpty()) {
                synonyms.addAll(fetchSynonymsFromDatamuse(keyword));
            }

            entry.setSynonymsJson(toJsonString(new ArrayList<>(synonyms)));
            entry.setWordTypesJson(toJsonString(wordTypes));
            entry.setWordFormsJson(toJsonString(fetchSimpleWordForms(entry.getWord())));

            return !isBlank(englishMeaning);
        } catch (Exception e) {
            return false;
        }
    }

    private void fetchFromDatamuse(String keyword, DictionaryEntry entry) {
        try {
            JsonNode payload = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("api.datamuse.com")
                            .path("/words")
                            .queryParam("ml", keyword)
                            .queryParam("md", "d")
                            .queryParam("max", 10)
                            .build())
                    .retrieve()
                    .body(JsonNode.class);

            if (payload == null || !payload.isArray() || payload.size() == 0) {
                return;
            }

            JsonNode firstItem = payload.get(0);

            String englishMeaning = "";
            JsonNode defs = firstItem.path("defs");

            if (defs.isArray() && defs.size() > 0) {
                String rawDefinition = defs.get(0).asText("");

                if (rawDefinition.contains("\t")) {
                    englishMeaning = rawDefinition.substring(rawDefinition.indexOf("\t") + 1);
                } else {
                    englishMeaning = rawDefinition;
                }
            }

            entry.setWord(keyword);
            entry.setEnglishMeaning(englishMeaning);

            // Datamuse fallback cũng dịch keyword, không dịch definition.
            entry.setVietnameseMeaning(translateToVietnamese(keyword));

            entry.setExampleEn("");
            entry.setExampleVi("");
            entry.setAudioUrl("");
            entry.setPhonetic("");
            entry.setSource("DATAMUSE_FALLBACK");

            List<String> synonyms = fetchSynonymsFromDatamuse(keyword);

            if (synonyms.isEmpty()) {
                synonyms = extractRelatedWords(payload, keyword);
            }

            entry.setSynonymsJson(toJsonString(synonyms));
            entry.setWordTypesJson("[]");
            entry.setWordFormsJson(toJsonString(fetchSimpleWordForms(keyword)));

        } catch (Exception e) {
            entry.setEnglishMeaning("");
            entry.setVietnameseMeaning("");
            entry.setExampleEn("");
            entry.setExampleVi("");
            entry.setAudioUrl("");
            entry.setPhonetic("");
            entry.setSynonymsJson("[]");
            entry.setWordTypesJson("[]");
            entry.setWordFormsJson("[]");
        }
    }

    private List<String> fetchSynonymsFromDatamuse(String keyword) {
        try {
            JsonNode payload = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("api.datamuse.com")
                            .path("/words")
                            .queryParam("rel_syn", keyword)
                            .queryParam("max", 12)
                            .build())
                    .retrieve()
                    .body(JsonNode.class);

            List<String> synonyms = new ArrayList<>();

            if (payload != null && payload.isArray()) {
                for (JsonNode item : payload) {
                    String word = getText(item, "word");

                    if (!isBlank(word) && !synonyms.contains(word)) {
                        synonyms.add(word);
                    }
                }
            }

            return synonyms;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private List<String> extractRelatedWords(JsonNode payload, String keyword) {
        List<String> words = new ArrayList<>();

        if (payload == null || !payload.isArray()) {
            return words;
        }

        for (JsonNode item : payload) {
            String word = getText(item, "word");

            if (!isBlank(word)
                    && !word.equalsIgnoreCase(keyword)
                    && !words.contains(word)) {
                words.add(word);
            }

            if (words.size() >= 12) {
                break;
            }
        }

        return words;
    }

    private String translateToVietnamese(String text) {
        if (isBlank(text)) {
            return "";
        }

        try {
            JsonNode payload = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("api.mymemory.translated.net")
                            .path("/get")
                            .queryParam("q", text)
                            .queryParam("langpair", "en|vi")
                            .build())
                    .retrieve()
                    .body(JsonNode.class);

            if (payload == null) {
                return "";
            }

            return payload
                    .path("responseData")
                    .path("translatedText")
                    .asText("");
        } catch (Exception e) {
            return "";
        }
    }

    private DictionaryResponse mapEntityToResponse(DictionaryEntry entry) {
    return new DictionaryResponse(
            safe(entry.getWord()),
            safe(entry.getPhonetic()),
            safe(entry.getAudioUrl()),
            safe(entry.getVietnameseMeaning()),
            safe(entry.getEnglishMeaning()),
            parseSynonyms(entry.getSynonymsJson()),
            parseWordTypes(entry.getWordTypesJson()),
            parseWordForms(entry.getWordFormsJson()),
            safe(entry.getExampleEn()),
            safe(entry.getExampleVi()),
            safe(entry.getSource())
    );
}

    private List<String> parseSynonyms(String json) {
        if (isBlank(json)) {
            return new ArrayList<>();
        }

        try {
            return jsonMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private List<WordTypeResponse> parseWordTypes(String json) {
        if (isBlank(json)) {
            return new ArrayList<>();
        }

        try {
            return jsonMapper.readValue(json, new TypeReference<List<WordTypeResponse>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private List<WordFormResponse> parseWordForms(String json) {
    if (isBlank(json)) {
        return new ArrayList<>();
    }

    try {
        return jsonMapper.readValue(json, new TypeReference<List<WordFormResponse>>() {});
    } catch (Exception e) {
        return new ArrayList<>();
    }
}

private List<WordFormResponse> fetchSimpleWordForms(String keyword) {
    List<WordFormResponse> wordForms = new ArrayList<>();

    if (isBlank(keyword) || keyword.contains(" ")) {
        return wordForms;
    }

    List<String> candidates = buildWordFormCandidates(keyword);
    Set<String> addedWords = new LinkedHashSet<>();

    for (String candidate : candidates) {
        if (wordForms.size() >= 6) {
            break;
        }

        WordFormResponse form = lookupSimpleWordForm(candidate);

        if (form == null || isBlank(form.getWord())) {
            continue;
        }

        String normalizedWord = normalizeKeyword(form.getWord());

        if (addedWords.contains(normalizedWord)) {
            continue;
        }

        addedWords.add(normalizedWord);
        wordForms.add(form);
    }

    return wordForms;
}

private List<String> buildWordFormCandidates(String keyword) {
    Set<String> candidates = new LinkedHashSet<>();

    String word = normalizeKeyword(keyword)
            .replaceAll("[^a-z-]", "");

    if (word.length() < 3) {
        return new ArrayList<>();
    }

    candidates.add(word);

    if (word.endsWith("ment") && word.length() > 6) {
        String base = word.substring(0, word.length() - 4);
        addCommonForms(base, candidates);
    } else if (word.endsWith("able") && word.length() > 6) {
        String base = word.substring(0, word.length() - 4);
        addCommonForms(base, candidates);
    } else if (word.endsWith("ed") && word.length() > 4) {
        String base = word.substring(0, word.length() - 1);
        addCommonForms(base, candidates);
    } else {
        addCommonForms(word, candidates);
    }

    return new ArrayList<>(candidates);
}

private void addCommonForms(String base, Set<String> candidates) {
    if (isBlank(base) || base.length() < 3) {
        return;
    }

    candidates.add(base);

    if (base.endsWith("e")) {
        String withoutE = base.substring(0, base.length() - 1);

        candidates.add(base + "d");
        candidates.add(withoutE + "ing");
        candidates.add(withoutE + "able");
        candidates.add(base + "ment");
    } else {
        candidates.add(base + "ed");
        candidates.add(base + "ing");
        candidates.add(base + "able");
        candidates.add(base + "ment");
    }
}


private WordFormResponse lookupSimpleWordForm(String candidate) {
    try {
        JsonNode payload = restClient.get()
                .uri("https://api.dictionaryapi.dev/api/v2/entries/en/{word}", candidate)
                .retrieve()
                .body(JsonNode.class);

        if (payload == null || !payload.isArray() || payload.size() == 0) {
            return null;
        }

        JsonNode firstItem = payload.get(0);

        String word = getText(firstItem, "word");

        if (isBlank(word)) {
            word = candidate;
        }

        JsonNode meanings = firstItem.path("meanings");

        String partOfSpeech = "";

        if (meanings.isArray()) {
            for (JsonNode meaning : meanings) {
                partOfSpeech = getText(meaning, "partOfSpeech");

                if (!isBlank(partOfSpeech)) {
                    break;
                }
            }
        }

        String code = getPartOfSpeechCode(normalizeKeyword(partOfSpeech));

        if (isBlank(code)) {
            return null;
        }

        String vietnameseMeaning = translateToVietnamese(word);

        if (isBlank(vietnameseMeaning)) {
            return null;
        }

        return new WordFormResponse(
                capitalizeFirstLetter(word),
                code,
                vietnameseMeaning
        );
    } catch (Exception e) {
        return null;
    }
}


private String capitalizeFirstLetter(String text) {
    if (isBlank(text)) {
        return "";
    }

    return text.substring(0, 1).toUpperCase() + text.substring(1);
}

    private String toJsonString(Object value) {
        try {
            return jsonMapper.writeValueAsString(value);
        } catch (Exception e) {
            return "[]";
        }
    }

    private WordTypeResponse buildWordTypeResponse(
            String partOfSpeech,
            String englishMeaning,
            String vietnameseMeaning
    ) {
        String normalizedType = normalizeKeyword(partOfSpeech);

        String code = getPartOfSpeechCode(normalizedType);
        String vietnameseName = getPartOfSpeechVietnameseName(normalizedType);

        String label;

        if (!isBlank(code) && !isBlank(vietnameseName)) {
            label = "(" + code + ") - " + vietnameseName;
        } else if (!isBlank(vietnameseName)) {
            label = vietnameseName;
        } else {
            label = partOfSpeech;
        }

        return new WordTypeResponse(
                code,
                partOfSpeech,
                vietnameseName,
                label,
                safe(englishMeaning),
                safe(vietnameseMeaning)
        );
    }

    private String getPartOfSpeechCode(String partOfSpeech) {
        return switch (partOfSpeech) {
            case "noun" -> "n";
            case "verb" -> "v";
            case "adjective" -> "adj";
            case "adverb" -> "adv";
            case "pronoun" -> "pron";
            case "preposition" -> "prep";
            case "conjunction" -> "conj";
            case "interjection" -> "interj";
            case "determiner" -> "det";
            case "article" -> "art";
            case "exclamation" -> "excl";
            case "prefix" -> "prefix";
            case "suffix" -> "suffix";
            case "phrasal verb" -> "phr.v";
            case "idiom" -> "idiom";
            default -> "";
        };
    }

    private String getPartOfSpeechVietnameseName(String partOfSpeech) {
        return switch (partOfSpeech) {
            case "noun" -> "danh từ";
            case "verb" -> "động từ";
            case "adjective" -> "tính từ";
            case "adverb" -> "trạng từ";
            case "pronoun" -> "đại từ";
            case "preposition" -> "giới từ";
            case "conjunction" -> "liên từ";
            case "interjection" -> "thán từ";
            case "determiner" -> "từ hạn định";
            case "article" -> "mạo từ";
            case "exclamation" -> "câu cảm thán";
            case "prefix" -> "tiền tố";
            case "suffix" -> "hậu tố";
            case "phrasal verb" -> "cụm động từ";
            case "idiom" -> "thành ngữ";
            default -> "";
        };
    }

    private String getText(JsonNode node, String fieldName) {
        if (node == null || node.path(fieldName).isMissingNode()) {
            return "";
        }

        return node.path(fieldName).asText("");
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return "";
        }

        return keyword.trim().toLowerCase();
    }

    private String normalizeAudioUrl(String audioUrl) {
        if (isBlank(audioUrl)) {
            return "";
        }

        if (audioUrl.startsWith("//")) {
            return "https:" + audioUrl;
        }

        return audioUrl;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}