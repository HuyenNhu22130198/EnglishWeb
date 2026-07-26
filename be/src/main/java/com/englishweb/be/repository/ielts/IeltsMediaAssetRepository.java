package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsMediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IeltsMediaAssetRepository extends JpaRepository<IeltsMediaAsset, Integer> {

    List<IeltsMediaAsset> findByExam_IdOrderBySkillAscPartNoAscDisplayOrderAscIdAsc(Integer examId);

    List<IeltsMediaAsset> findByExam_IdAndSkillIgnoreCaseOrderByPartNoAscDisplayOrderAscIdAsc(Integer examId, String skill);
}
