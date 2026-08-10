package com.englishweb.be.repository.toeic;

import com.englishweb.be.entity.toeic.ToeicQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ToeicQuestionRepository extends JpaRepository<ToeicQuestion, Integer> {

    long countByExam_Id(Integer examId);

    List<ToeicQuestion> findByGroup_IdOrderByQuestionNoAsc(Integer groupId);

    List<ToeicQuestion> findByExam_IdOrderByQuestionNoAsc(Integer examId);

    @Query("""
            SELECT q
            FROM ToeicQuestion q
            JOIN FETCH q.exam
            JOIN FETCH q.group
            ORDER BY q.exam.id ASC, q.questionNo ASC, q.id ASC
            """)
    List<ToeicQuestion> findAllForChatbot();

    @Query("""
            SELECT q
            FROM ToeicQuestion q
            JOIN FETCH q.exam
            JOIN FETCH q.group
            WHERE q.exam.id = :examId
              AND q.questionNo = :questionNo
            ORDER BY q.id ASC
            """)
    List<ToeicQuestion> findForChatbotByExamAndQuestionNo(@Param("examId") Integer examId,
                                                          @Param("questionNo") Integer questionNo);
}
