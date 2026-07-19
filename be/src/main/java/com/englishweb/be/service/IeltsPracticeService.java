package com.englishweb.be.service;

import com.englishweb.be.dto.ielts.IeltsPracticeResponse;
import com.englishweb.be.entity.ielts.IeltsExam;
import com.englishweb.be.entity.ielts.IeltsMediaAsset;
import com.englishweb.be.entity.ielts.IeltsQuestion;
import com.englishweb.be.entity.ielts.IeltsQuestionBlock;
import com.englishweb.be.entity.ielts.IeltsQuestionOption;
import com.englishweb.be.entity.ielts.IeltsSectionGroup;
import com.englishweb.be.entity.ielts.IeltsWritingTask;
import com.englishweb.be.repository.ielts.IeltsExamRepository;
import com.englishweb.be.repository.ielts.IeltsMediaAssetRepository;
import com.englishweb.be.repository.ielts.IeltsQuestionBlockRepository;
import com.englishweb.be.repository.ielts.IeltsQuestionOptionRepository;
import com.englishweb.be.repository.ielts.IeltsQuestionRepository;
import com.englishweb.be.repository.ielts.IeltsSectionGroupRepository;
import com.englishweb.be.repository.ielts.IeltsWritingTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class IeltsPracticeService {

    private final IeltsExamRepository ieltsExamRepository;
    private final IeltsMediaAssetRepository ieltsMediaAssetRepository;
    private final IeltsSectionGroupRepository ieltsSectionGroupRepository;
    private final IeltsQuestionBlockRepository ieltsQuestionBlockRepository;
    private final IeltsQuestionRepository ieltsQuestionRepository;
    private final IeltsQuestionOptionRepository ieltsQuestionOptionRepository;
    private final IeltsWritingTaskRepository ieltsWritingTaskRepository;

    @Transactional(readOnly = true)
    public IeltsPracticeResponse getPracticeExam(Integer examId, String skill) {
        IeltsExam exam = ieltsExamRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề IELTS!"));

        String normalizedSkill = normalizeSkill(skill);

        List<IeltsMediaAsset> assets = ieltsMediaAssetRepository
                .findByExam_IdAndSkillIgnoreCaseOrderByPartNoAscDisplayOrderAscIdAsc(examId, normalizedSkill);

        if ("WRITING".equals(normalizedSkill)) {
            List<IeltsPracticeResponse.WritingTaskResponse> writingTasks = ieltsWritingTaskRepository
                    .findByExam_IdOrderByTaskNoAscDisplayOrderAscIdAsc(examId)
                    .stream()
                    .map(task -> toWritingTaskResponse(task, assets))
                    .toList();

            return IeltsPracticeResponse.builder()
                    .examId(exam.getId())
                    .examCode(exam.getExamCode())
                    .examName(exam.getExamName())
                    .skill(normalizedSkill)
                    .totalQuestions(writingTasks.size())
                    .assets(assets.stream().map(this::toAssetResponse).toList())
                    .groups(List.of())
                    .writingTasks(writingTasks)
                    .build();
        }

        List<IeltsPracticeResponse.GroupResponse> groups = ieltsSectionGroupRepository
                .findByExam_IdAndSkillIgnoreCaseOrderByPartNoAscGroupNoAscDisplayOrderAscIdAsc(examId, normalizedSkill)
                .stream()
                .map(this::toGroupResponse)
                .toList();

        int totalQuestions = groups.stream()
                .mapToInt(group -> group.getBlocks().stream().mapToInt(block -> block.getQuestions().size()).sum())
                .sum();

        return IeltsPracticeResponse.builder()
                .examId(exam.getId())
                .examCode(exam.getExamCode())
                .examName(exam.getExamName())
                .skill(normalizedSkill)
                .totalQuestions(totalQuestions)
                .assets(assets.stream().map(this::toAssetResponse).toList())
                .groups(groups)
                .build();
    }

    private IeltsPracticeResponse.WritingTaskResponse toWritingTaskResponse(
            IeltsWritingTask task,
            List<IeltsMediaAsset> assets
    ) {
        IeltsMediaAsset taskAsset = assets.stream()
                .filter(asset -> task.getTaskNo().equals(asset.getPartNo()))
                .findFirst()
                .orElse(null);

        return IeltsPracticeResponse.WritingTaskResponse.builder()
                .taskId(task.getId())
                .taskNo(task.getTaskNo())
                .taskType(task.getTaskType())
                .instruction(task.getInstructionText())
                .prompt(task.getPromptText())
                .minWords(task.getMinWords())
                .asset(toAssetResponse(taskAsset))
                .build();
    }

    private IeltsPracticeResponse.GroupResponse toGroupResponse(IeltsSectionGroup group) {
        return IeltsPracticeResponse.GroupResponse.builder()
                .groupId(group.getId())
                .partNo(group.getPartNo())
                .groupNo(group.getGroupNo())
                .title(group.getTitle())
                .instructionText(group.getInstructionText())
                .sharedText(group.getSharedText())
                .mainAsset(toAssetResponse(group.getMainAsset()))
                .blocks(ieltsQuestionBlockRepository.findByGroup_IdOrderByDisplayOrderAscBlockNoAscIdAsc(group.getId())
                        .stream()
                        .map(this::toBlockResponse)
                        .toList())
                .build();
    }

    private IeltsPracticeResponse.BlockResponse toBlockResponse(IeltsQuestionBlock block) {
        return IeltsPracticeResponse.BlockResponse.builder()
                .blockId(block.getId())
                .blockNo(block.getBlockNo())
                .questionType(block.getQuestionType())
                .instructionText(block.getInstructionText())
                .maxAnswers(block.getMaxAnswers())
                .answerFormat(block.getAnswerFormat())
                .displayOrder(block.getDisplayOrder())
                .questions(ieltsQuestionRepository.findByBlock_IdOrderByDisplayOrderAscQuestionNoAscQuestionIdAsc(block.getId())
                        .stream()
                        .map(this::toQuestionResponse)
                        .toList())
                .build();
    }

    private IeltsPracticeResponse.QuestionResponse toQuestionResponse(IeltsQuestion question) {
        return IeltsPracticeResponse.QuestionResponse.builder()
                .questionId(question.getQuestionId())
                .questionNo(question.getQuestionNo())
                .promptText(question.getPromptText())
                .displayOrder(question.getDisplayOrder())
                .options(ieltsQuestionOptionRepository.findByQuestion_QuestionIdOrderByDisplayOrderAscIdAsc(question.getQuestionId())
                        .stream()
                        .map(this::toOptionResponse)
                        .toList())
                .build();
    }

    private IeltsPracticeResponse.OptionResponse toOptionResponse(IeltsQuestionOption option) {
        return IeltsPracticeResponse.OptionResponse.builder()
                .optionId(option.getId())
                .optionKey(option.getOptionKey())
                .optionText(option.getOptionText())
                .displayOrder(option.getDisplayOrder())
                .build();
    }

    private IeltsPracticeResponse.AssetResponse toAssetResponse(IeltsMediaAsset asset) {
        if (asset == null) {
            return null;
        }

        return IeltsPracticeResponse.AssetResponse.builder()
                .id(asset.getId())
                .partNo(asset.getPartNo())
                .assetType(asset.getAssetType())
                .assetUrl(asset.getAssetUrl())
                .displayOrder(asset.getDisplayOrder())
                .build();
    }

    private String normalizeSkill(String skill) {
        String normalized = skill == null ? "" : skill.trim().toUpperCase();

        if (!"LISTENING".equals(normalized) && !"READING".equals(normalized) && !"WRITING".equals(normalized)) {
            throw new RuntimeException("Kỹ năng IELTS chưa được hỗ trợ hoặc không hợp lệ!");
        }

        return normalized;
    }
}
