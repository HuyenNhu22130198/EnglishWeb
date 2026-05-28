package com.englishweb.be.service;

import com.englishweb.be.dto.toeic.ToeicPracticeResponse;
import com.englishweb.be.entity.toeic.ToeicExam;
import com.englishweb.be.entity.toeic.ToeicGroup;
import com.englishweb.be.entity.toeic.ToeicGroupMaterial;
import com.englishweb.be.entity.toeic.ToeicQuestion;
import com.englishweb.be.entity.toeic.ToeicQuestionOption;
import com.englishweb.be.repository.toeic.ToeicExamRepository;
import com.englishweb.be.repository.toeic.ToeicGroupMaterialRepository;
import com.englishweb.be.repository.toeic.ToeicGroupRepository;
import com.englishweb.be.repository.toeic.ToeicQuestionOptionRepository;
import com.englishweb.be.repository.toeic.ToeicQuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ToeicPracticeService {

    private final ToeicExamRepository toeicExamRepository;
    private final ToeicGroupRepository toeicGroupRepository;
    private final ToeicGroupMaterialRepository toeicGroupMaterialRepository;
    private final ToeicQuestionRepository toeicQuestionRepository;
    private final ToeicQuestionOptionRepository toeicQuestionOptionRepository;

    @Transactional(readOnly = true)
    public ToeicPracticeResponse getPracticeExam(Integer examId) {
        ToeicExam exam = toeicExamRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đề TOEIC!"));

        List<ToeicPracticeResponse.GroupResponse> groups = toeicGroupRepository
                .findByExam_IdOrderByPartNoAscGroupNoAscIdAsc(examId)
                .stream()
                .map(this::toGroupResponse)
                .toList();

        int totalQuestions = groups.stream()
                .mapToInt(group -> group.getQuestions().size())
                .sum();

        return ToeicPracticeResponse.builder()
                .examId(exam.getId())
                .examCode(exam.getExamCode())
                .examName(exam.getExamName())
                .listeningAudioUrl(exam.getListeningAudioUrl())
                .totalQuestions(totalQuestions)
                .groups(groups)
                .build();
    }

    private ToeicPracticeResponse.GroupResponse toGroupResponse(ToeicGroup group) {
        Integer partNo = group.getPartNo();

        List<ToeicPracticeResponse.MaterialResponse> materials =
                toeicGroupMaterialRepository.findByGroup_IdOrderByDisplayOrderAsc(group.getId())
                        .stream()
                        .filter(material -> shouldKeepMaterialForPractice(partNo, material))
                        .map(this::toMaterialResponse)
                        .toList();

        List<ToeicPracticeResponse.QuestionResponse> questions =
                toeicQuestionRepository.findByGroup_IdOrderByQuestionNoAsc(group.getId())
                        .stream()
                        .map(question -> toQuestionResponse(question, partNo))
                        .toList();

        return ToeicPracticeResponse.GroupResponse.builder()
                .groupId(group.getId())
                .section(group.getSection())
                .partNo(partNo)
                .groupNo(group.getGroupNo())
                .groupType(group.getGroupType())
                .title(group.getTitle())
                .instructionText(null)
                .sharedText(shouldShowSharedText(partNo) ? group.getSharedText() : null)
                .materials(materials)
                .questions(questions)
                .build();
    }

    private ToeicPracticeResponse.MaterialResponse toMaterialResponse(ToeicGroupMaterial material) {
        return ToeicPracticeResponse.MaterialResponse.builder()
                .id(material.getId())
                .materialType(material.getMaterialType())
                .content(material.getContent())
                .assetUrl(material.getAssetUrl())
                .displayOrder(material.getDisplayOrder())
                .build();
    }

    private ToeicPracticeResponse.QuestionResponse toQuestionResponse(ToeicQuestion question, Integer partNo) {
        List<ToeicPracticeResponse.OptionResponse> options =
                toeicQuestionOptionRepository.findByQuestion_IdOrderByDisplayOrderAsc(question.getId())
                        .stream()
                        .filter(option -> shouldKeepOption(partNo, option))
                        .map(option -> toOptionResponse(option, partNo))
                        .toList();

        return ToeicPracticeResponse.QuestionResponse.builder()
                .questionId(question.getId())
                .questionNo(question.getQuestionNo())
                .questionText(shouldShowQuestionText(partNo) ? question.getQuestionText() : null)
                .imageUrl(question.getImageUrl())
                .displayOrder(question.getDisplayOrder())
                .options(options)
                .build();
    }

    private ToeicPracticeResponse.OptionResponse toOptionResponse(ToeicQuestionOption option, Integer partNo) {
        return ToeicPracticeResponse.OptionResponse.builder()
                .optionId(option.getOptionId())
                .optionLabel(option.getOptionLabel())
                .optionText(shouldShowOptionText(partNo) ? option.getOptionText() : null)
                .displayOrder(option.getDisplayOrder())
                .build();
    }

    private boolean shouldShowSharedText(Integer partNo) {
        return partNo != null && partNo >= 6;
    }

    private boolean shouldShowQuestionText(Integer partNo) {
        return partNo == null || partNo >= 3;
    }

    private boolean shouldShowOptionText(Integer partNo) {
        return partNo == null || partNo >= 3;
    }

    private boolean shouldKeepOption(Integer partNo, ToeicQuestionOption option) {
        if (partNo == null || partNo != 2) {
            return true;
        }

        String label = option.getOptionLabel();

        if (label == null) {
            return false;
        }

        return label.equalsIgnoreCase("A")
                || label.equalsIgnoreCase("B")
                || label.equalsIgnoreCase("C");
    }

    private boolean shouldKeepMaterialForPractice(Integer partNo, ToeicGroupMaterial material) {
        if (partNo == null) {
            return true;
        }

        if (partNo >= 1 && partNo <= 4) {
            return isImageMaterial(material);
        }

        return true;
    }

    private boolean isImageMaterial(ToeicGroupMaterial material) {
        String type = material.getMaterialType();

        if (type == null) {
            return false;
        }

        String normalizedType = type.toLowerCase();

        return normalizedType.contains("image")
                || normalizedType.contains("picture")
                || normalizedType.contains("photo");
    }
}