package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsSectionGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IeltsSectionGroupRepository extends JpaRepository<IeltsSectionGroup, Integer> {

    List<IeltsSectionGroup> findByExam_IdAndSkillIgnoreCaseOrderByPartNoAscGroupNoAscDisplayOrderAscIdAsc(
            Integer examId,
            String skill
    );
}
