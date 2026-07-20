package com.englishweb.be.repository.ielts;
import com.englishweb.be.entity.ielts.IeltsSpeakingUserAnswer;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface IeltsSpeakingUserAnswerRepository extends JpaRepository<IeltsSpeakingUserAnswer, Integer> {
    Optional<IeltsSpeakingUserAnswer> findByAttempt_IdAndSampleAnswer_Id(Integer attemptId, Integer sampleAnswerId);
    long countByAttempt_Id(Integer attemptId);
    @Query("""
      SELECT a FROM IeltsSpeakingUserAnswer a
      JOIN FETCH a.speakingTask t LEFT JOIN FETCH a.speakingItem LEFT JOIN FETCH a.sampleAnswer
      WHERE a.attempt.id = :attemptId ORDER BY t.partNo, t.displayOrder, a.sampleAnswer.displayOrder, a.id
      """)
    List<IeltsSpeakingUserAnswer> findResultAnswers(@Param("attemptId") Integer attemptId);
}
