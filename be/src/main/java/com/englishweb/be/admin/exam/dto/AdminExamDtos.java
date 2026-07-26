package com.englishweb.be.admin.exam.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;
import java.util.List;

public final class AdminExamDtos {
    private AdminExamDtos() {}

    public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {}

    public record ExamSummary(
            Integer id, String examCode, String examName, String examType, String status,
            long questionCount, long attemptCount, LocalDateTime createdAt, LocalDateTime updatedAt) {}

    public record ExamUpdateRequest(
            @NotBlank(message = "Mã đề không được để trống") String examCode,
            @NotBlank(message = "Tên đề không được để trống") String examName,
            String listeningAudioUrl,
            @NotBlank(message = "Trạng thái không được để trống") String status) {}

    public record StatusUpdateRequest(@NotBlank(message = "Trạng thái không được để trống") String status) {}

    public record OptionDetail(Integer id, String label, String text, Integer displayOrder) {}
    public record MaterialDetail(Integer id, String type, String content, String assetUrl, Integer displayOrder) {}
    public record QuestionDetail(Integer id, Integer number, String text, String correctAnswer,
                                 String explanation, String transcript, String imageUrl,
                                 Integer displayOrder, List<OptionDetail> options, List<OptionDetail> answers) {}
    public record BlockDetail(Integer id, Integer number, String type, String instruction,
                              Integer maxAnswers, String answerFormat, Integer displayOrder,
                              List<QuestionDetail> questions) {}
    public record GroupDetail(Integer id, String skill, Integer partNo, Integer groupNo, String type,
                              String title, String instruction, String sharedText, Integer displayOrder,
                              List<MaterialDetail> media, List<BlockDetail> blocks, List<QuestionDetail> questions) {}
    public record WritingTaskDetail(Integer id, Integer taskNo, String taskType, String instruction,
                                    String prompt, Integer minWords, Integer displayOrder,
                                    List<OptionDetail> samples) {}
    public record SpeakingTaskDetail(Integer id, Integer partNo, String title, String instruction,
                                     Integer displayOrder, List<OptionDetail> items, List<OptionDetail> samples) {}
    public record ExamDetail(ExamSummary exam, String listeningAudioUrl, List<GroupDetail> groups,
                             List<WritingTaskDetail> writingTasks, List<SpeakingTaskDetail> speakingTasks,
                             List<MaterialDetail> media) {}

    /** DTO dùng chung cho việc sửa record hiện có; controller không nhận entity hoặc khóa ngoại. */
    public record ContentUpdateRequest(
            String title, String instruction, String sharedText, String text, String questionText,
            String promptText, String explanation, String transcript, String imageUrl, String audioUrl,
            String correctAnswer, String label, String type, String content, String assetUrl,
            String answerText, String answerKey, String topicTitle, String sampleAnswer,
            Integer displayOrder, Integer minWords, Integer maxAnswers) {}
}
