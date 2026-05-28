package com.englishweb.be.repository.toeic;

import com.englishweb.be.entity.toeic.ToeicAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ToeicAttemptRepository extends JpaRepository<ToeicAttempt, Integer> {

    long countByExam_Id(Integer examId);

    Optional<ToeicAttempt> findByIdAndUser_Email(Integer attemptId, String email);
}