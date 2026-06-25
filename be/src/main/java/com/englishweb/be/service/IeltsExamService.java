package com.englishweb.be.service;

import com.englishweb.be.dto.ielts.IeltsExamListResponse;
import com.englishweb.be.entity.ielts.IeltsExam;
import com.englishweb.be.repository.ielts.IeltsAttemptRepository;
import com.englishweb.be.repository.ielts.IeltsExamRepository;
import com.englishweb.be.repository.ielts.IeltsQuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IeltsExamService {

    private final IeltsExamRepository ieltsExamRepository;
    private final IeltsQuestionRepository ieltsQuestionRepository;
    private final IeltsAttemptRepository ieltsAttemptRepository;

    @Transactional(readOnly = true)
    public List<IeltsExamListResponse> getIeltsExams(String keyword) {
        String searchValue = keyword == null ? "" : keyword.trim();

        List<IeltsExam> exams = searchValue.isBlank()
                ? ieltsExamRepository.findAllByOrderByIdAsc()
                : ieltsExamRepository.searchByKeyword(searchValue);

        return exams.stream()
                .map(this::toExamListResponse)
                .toList();
    }

    private IeltsExamListResponse toExamListResponse(IeltsExam exam) {
        int listeningQuestions = (int) ieltsQuestionRepository.countByExamIdAndSkill(exam.getId(), "LISTENING");
        int readingQuestions = (int) ieltsQuestionRepository.countByExamIdAndSkill(exam.getId(), "READING");
        int totalQuestions = listeningQuestions + readingQuestions;

        List<String> availableSkills = new ArrayList<>();
        if (listeningQuestions > 0) {
            availableSkills.add("LISTENING");
        }
        if (readingQuestions > 0) {
            availableSkills.add("READING");
        }

        return IeltsExamListResponse.builder()
                .id(exam.getId())
                .examCode(exam.getExamCode())
                .title(exam.getExamName())
                .description(buildDescription(listeningQuestions, readingQuestions))
                .status(exam.getStatus())
                .totalQuestions(totalQuestions)
                .listeningQuestions(listeningQuestions)
                .readingQuestions(readingQuestions)
                .attempts(ieltsAttemptRepository.countByExam_Id(exam.getId()))
                .availableSkills(availableSkills)
                .build();
    }

    private String buildDescription(int listeningQuestions, int readingQuestions) {
        List<String> parts = new ArrayList<>();

        if (listeningQuestions > 0) {
            parts.add("Listening " + listeningQuestions + " câu");
        }

        if (readingQuestions > 0) {
            parts.add("Reading " + readingQuestions + " câu");
        }

        if (parts.isEmpty()) {
            return "Đề IELTS chưa có dữ liệu câu hỏi.";
        }

        return String.join(" • ", parts);
    }
}
