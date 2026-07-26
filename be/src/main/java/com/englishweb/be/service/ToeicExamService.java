package com.englishweb.be.service;

import com.englishweb.be.dto.toeic.ToeicExamListResponse;
import com.englishweb.be.entity.toeic.ToeicExam;
import com.englishweb.be.repository.toeic.ToeicAttemptRepository;
import com.englishweb.be.repository.toeic.ToeicExamRepository;
import com.englishweb.be.repository.toeic.ToeicQuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ToeicExamService {

    private final ToeicExamRepository toeicExamRepository;
    private final ToeicQuestionRepository toeicQuestionRepository;
    private final ToeicAttemptRepository toeicAttemptRepository;

    public List<ToeicExamListResponse> getToeicExams(String keyword) {
        String searchValue = keyword == null ? "" : keyword.trim();

        List<ToeicExam> exams = searchValue.isBlank()
                ? toeicExamRepository.findAllByOrderByIdAsc()
                : toeicExamRepository.searchByKeyword(searchValue);

        return exams.stream()
                .filter(exam -> !"hidden".equalsIgnoreCase(exam.getStatus()))
                .map(this::toExamListResponse)
                .toList();
    }

    private ToeicExamListResponse toExamListResponse(ToeicExam exam) {
        int questionCount = (int) toeicQuestionRepository.countByExam_Id(exam.getId());
        long attemptCount = toeicAttemptRepository.countByExam_Id(exam.getId());

        return ToeicExamListResponse.builder()
                .id(exam.getId())
                .examCode(exam.getExamCode())
                .title(exam.getExamName())
                .description(buildDescription(exam))
                .year(extractYear(exam))
                .questions(questionCount)
                .duration(120)
                .parts("Part 1 - Part 7")
                .score(990)
                .status(formatStatus(exam.getStatus()))
                .attempts(attemptCount)
                .listeningAudioUrl(exam.getListeningAudioUrl())
                .build();
    }

    private String buildDescription(ToeicExam exam) {
        return exam.getExamName()
                + " gồm đầy đủ phần Listening và Reading, mô phỏng cấu trúc đề thi TOEIC thực tế.";
    }

    private Integer extractYear(ToeicExam exam) {
        String source = (exam.getExamCode() + " " + exam.getExamName()).toUpperCase();

        Pattern pattern = Pattern.compile("(20\\d{2})");
        Matcher matcher = pattern.matcher(source);

        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }

        return null;
    }

    private String formatStatus(String status) {
        if (status == null || status.isBlank()) {
            return "Đã sẵn sàng";
        }

        if (status.equalsIgnoreCase("published")
                || status.equalsIgnoreCase("active")
                || status.equalsIgnoreCase("ready")) {
            return "Đã sẵn sàng";
        }

        if (status.equalsIgnoreCase("draft")) {
            return "Bản nháp";
        }

        return status;
    }
}
