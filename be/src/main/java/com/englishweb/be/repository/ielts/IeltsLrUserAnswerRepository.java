package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsLrUserAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IeltsLrUserAnswerRepository extends JpaRepository<IeltsLrUserAnswer, Integer> {

    long countByAttempt_Id(Integer attemptId);

    @Query("""
            SELECT ua
            FROM IeltsLrUserAnswer ua
            JOIN FETCH ua.question q
            JOIN FETCH q.block b
            JOIN FETCH b.group g
            LEFT JOIN FETCH ua.selectedOption
            WHERE ua.attempt.id = :attemptId
            ORDER BY q.questionNo ASC, q.questionId ASC
            """)
    List<IeltsLrUserAnswer> findResultAnswers(@Param("attemptId") Integer attemptId);

    @Query("""
            SELECT COUNT(ua)
            FROM IeltsLrUserAnswer ua
            WHERE ua.attempt.id = :attemptId
              AND (
                (ua.selectedOptionKey IS NOT NULL AND TRIM(ua.selectedOptionKey) <> '')
                OR (ua.answerText IS NOT NULL AND TRIM(ua.answerText) <> '')
              )
            """)
    long countAnsweredAnswersByAttemptId(@Param("attemptId") Integer attemptId);
}
