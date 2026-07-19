package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface IeltsAttemptRepository extends JpaRepository<IeltsAttempt, Integer> {

    long countByExam_Id(Integer examId);

    Optional<IeltsAttempt> findByIdAndUser_Email(Integer attemptId, String email);

    @Query("""
            SELECT a
            FROM IeltsAttempt a
            JOIN FETCH a.exam
            WHERE a.user.email = :email
              AND a.status = 'SUBMITTED'
              AND UPPER(a.skill) IN ('LISTENING', 'READING')
            ORDER BY a.submittedAt DESC, a.id DESC
            """)
    List<IeltsAttempt> findSubmittedLrAttemptsByUserEmail(@Param("email") String email);

    @Query("""
            SELECT a
            FROM IeltsAttempt a
            JOIN FETCH a.exam
            WHERE a.user.email = :email
              AND a.status = 'SUBMITTED'
              AND UPPER(a.skill) = 'WRITING'
            ORDER BY a.submittedAt DESC, a.id DESC
            """)
    List<IeltsAttempt> findSubmittedWritingAttemptsByUserEmail(@Param("email") String email);
}
