package com.englishweb.be.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IeltsWritingSimilarityServiceTest {

    private final IeltsWritingSimilarityService service = new IeltsWritingSimilarityService();

    @Test
    void normalizesPunctuationWhitespaceCaseAndStopWords() {
        assertEquals(List.of("quick", "fox"), service.normalizeAndTokenize(" The QUICK,   fox! "));
    }

    @Test
    void countsMatchesUsingTokenFrequencies() {
        var result = service.compare("cat cat dog", "cat dog dog bird");

        assertEquals(2, result.matchedWordCount());
        assertEquals(new BigDecimal("57.14"), result.similarityPercent());
    }

    @Test
    void returnsZeroWhenEitherSideHasNoValidTokens() {
        var result = service.compare("the and of", "useful sample words");

        assertEquals(0, result.matchedWordCount());
        assertEquals(new BigDecimal("0.00"), result.similarityPercent());
    }

    @Test
    void similarityAlwaysStaysWithinRangeAndHasTwoDecimals() {
        var result = service.compare("alpha beta gamma", "alpha beta gamma");

        assertTrue(result.similarityPercent().compareTo(BigDecimal.ZERO) >= 0);
        assertTrue(result.similarityPercent().compareTo(BigDecimal.valueOf(100)) <= 0);
        assertEquals(2, result.similarityPercent().scale());
    }
}
