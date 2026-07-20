package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsQuestionBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IeltsQuestionBlockRepository extends JpaRepository<IeltsQuestionBlock, Integer> {

    List<IeltsQuestionBlock> findByGroup_IdOrderByDisplayOrderAscBlockNoAscIdAsc(Integer groupId);
}
