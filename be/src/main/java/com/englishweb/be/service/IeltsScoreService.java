package com.englishweb.be.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class IeltsScoreService {

    public BigDecimal estimateBand(String skill, int correctCount) {
        String normalizedSkill = normalizeSkill(skill);

        if ("READING".equals(normalizedSkill)) {
            return BigDecimal.valueOf(getReadingBand(correctCount));
        }

        return BigDecimal.valueOf(getListeningBand(correctCount));
    }

    private double getListeningBand(int correctCount) {
        if (correctCount >= 39) return 9.0;
        if (correctCount >= 37) return 8.5;
        if (correctCount >= 35) return 8.0;
        if (correctCount >= 33) return 7.5;
        if (correctCount >= 30) return 7.0;
        if (correctCount >= 27) return 6.5;
        if (correctCount >= 23) return 6.0;
        if (correctCount >= 20) return 5.5;
        if (correctCount >= 16) return 5.0;
        if (correctCount >= 13) return 4.5;
        if (correctCount >= 10) return 4.0;
        if (correctCount >= 7) return 3.5;
        if (correctCount >= 5) return 3.0;
        if (correctCount >= 3) return 2.5;
        if (correctCount >= 2) return 2.0;
        if (correctCount >= 1) return 1.5;
        return 0.0;
    }

    private double getReadingBand(int correctCount) {
        if (correctCount >= 39) return 9.0;
        if (correctCount >= 37) return 8.5;
        if (correctCount >= 35) return 8.0;
        if (correctCount >= 33) return 7.5;
        if (correctCount >= 30) return 7.0;
        if (correctCount >= 27) return 6.5;
        if (correctCount >= 23) return 6.0;
        if (correctCount >= 20) return 5.5;
        if (correctCount >= 16) return 5.0;
        if (correctCount >= 13) return 4.5;
        if (correctCount >= 10) return 4.0;
        if (correctCount >= 7) return 3.5;
        if (correctCount >= 5) return 3.0;
        if (correctCount >= 3) return 2.5;
        if (correctCount >= 2) return 2.0;
        if (correctCount >= 1) return 1.5;
        return 0.0;
    }

    private String normalizeSkill(String skill) {
        return skill == null ? "LISTENING" : skill.trim().toUpperCase();
    }
}
