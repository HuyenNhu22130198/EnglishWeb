package com.englishweb.be.repository.toeic;

import com.englishweb.be.entity.toeic.ToeicUserAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface ToeicUserAnswerRepository extends JpaRepository<ToeicUserAnswer, Integer> {

    @Query("""
            SELECT ua
            FROM ToeicUserAnswer ua
            JOIN FETCH ua.question q
            JOIN FETCH q.group g
            LEFT JOIN FETCH ua.selectedOption
            WHERE ua.attempt.id = :attemptId
            ORDER BY q.questionNo ASC
            """)
    List<ToeicUserAnswer> findResultAnswers(@Param("attemptId") Integer attemptId);

    @Query("""
            SELECT COUNT(ua)
            FROM ToeicUserAnswer ua
            WHERE ua.attempt.id = :attemptId
              AND ua.selectedLabel IS NOT NULL
              AND TRIM(ua.selectedLabel) <> ''
            """)
    long countAnsweredAnswersByAttemptId(@Param("attemptId") Integer attemptId);
}
