package com.englishweb.be.service;

import org.springframework.stereotype.Service;

@Service
public class ToeicScoreService {

    public int getListeningScore(int correctCount) {
        int correct = clamp(correctCount);

        if (correct == 0) {
            return 5;
        }

        if (correct <= 75) {
            return correct * 5 + 10;
        }

        if (correct <= 95) {
            return correct * 5 + 15;
        }

        return 495;
    }

    public int getReadingScore(int correctCount) {
        int correct = clamp(correctCount);

        if (correct <= 2) {
            return 5;
        }

        if (correct <= 99) {
            return correct * 5 - 5;
        }

        return 495;
    }

    private int clamp(int value) {
        if (value < 0) {
            return 0;
        }

        if (value > 100) {
            return 100;
        }

        return value;
    }
}