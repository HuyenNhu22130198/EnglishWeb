package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IeltsAttemptRepository extends JpaRepository<IeltsAttempt, Integer> {

    long countByExam_Id(Integer examId);

    Optional<IeltsAttempt> findByIdAndUser_Email(Integer attemptId, String email);
}
