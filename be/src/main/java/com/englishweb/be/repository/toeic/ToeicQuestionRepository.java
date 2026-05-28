package com.englishweb.be.repository.toeic;

import com.englishweb.be.entity.toeic.ToeicQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ToeicQuestionRepository extends JpaRepository<ToeicQuestion, Integer> {

    long countByExam_Id(Integer examId);

    List<ToeicQuestion> findByGroup_IdOrderByQuestionNoAsc(Integer groupId);

    List<ToeicQuestion> findByExam_IdOrderByQuestionNoAsc(Integer examId);
}