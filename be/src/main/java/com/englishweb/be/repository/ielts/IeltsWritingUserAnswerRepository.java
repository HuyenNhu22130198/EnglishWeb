package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsWritingUserAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IeltsWritingUserAnswerRepository extends JpaRepository<IeltsWritingUserAnswer, Integer> {

    @Query("""
            SELECT answer
            FROM IeltsWritingUserAnswer answer
            JOIN FETCH answer.task task
            LEFT JOIN FETCH answer.sampleAnswer
            WHERE answer.attempt.id = :attemptId
            ORDER BY task.taskNo ASC, task.displayOrder ASC, task.id ASC
            """)
    List<IeltsWritingUserAnswer> findResultAnswers(@Param("attemptId") Integer attemptId);
}
