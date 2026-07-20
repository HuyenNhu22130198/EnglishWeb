package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IeltsQuestionRepository extends JpaRepository<IeltsQuestion, Integer> {

    List<IeltsQuestion> findByBlock_IdOrderByDisplayOrderAscQuestionNoAscQuestionIdAsc(Integer blockId);

    @Query("""
            SELECT q
            FROM IeltsQuestion q
            WHERE q.exam.id = :examId
              AND LOWER(q.block.group.skill) = LOWER(:skill)
            ORDER BY q.questionNo ASC, q.questionId ASC
            """)
    List<IeltsQuestion> findByExamIdAndSkill(@Param("examId") Integer examId, @Param("skill") String skill);

    long countByExam_Id(Integer examId);

    @Query("""
            SELECT COUNT(q)
            FROM IeltsQuestion q
            WHERE q.exam.id = :examId
              AND LOWER(q.block.group.skill) = LOWER(:skill)
            """)
    long countByExamIdAndSkill(@Param("examId") Integer examId, @Param("skill") String skill);

    @Query("""
            SELECT q
            FROM IeltsQuestion q
            JOIN FETCH q.exam
            JOIN FETCH q.block b
            JOIN FETCH b.group
            ORDER BY q.exam.id ASC, q.questionNo ASC, q.questionId ASC
            """)
    List<IeltsQuestion> findAllForChatbot();
}
