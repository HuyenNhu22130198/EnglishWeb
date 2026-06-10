package com.englishweb.be.repository.toeic;

import com.englishweb.be.entity.toeic.ToeicAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ToeicAttemptRepository extends JpaRepository<ToeicAttempt, Integer> {

    long countByExam_Id(Integer examId);

    Optional<ToeicAttempt> findByIdAndUser_Email(Integer attemptId, String email);

    @Query("""
            SELECT a
            FROM ToeicAttempt a
            JOIN FETCH a.exam
            WHERE a.user.email = :email
              AND a.status = 'SUBMITTED'
            ORDER BY a.submittedAt DESC, a.id DESC
            """)
    List<ToeicAttempt> findSubmittedAttemptsByUserEmail(@Param("email") String email);
}
