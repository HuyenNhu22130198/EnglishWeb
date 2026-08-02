package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsSpeakingFreeAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IeltsSpeakingFreeAnswerRepository extends JpaRepository<IeltsSpeakingFreeAnswer, Integer> {
    List<IeltsSpeakingFreeAnswer> findByAttempt_IdOrderByIdAsc(Integer attemptId);
    long countByAttempt_Id(Integer attemptId);
    Optional<IeltsSpeakingFreeAnswer> findByAttempt_IdAndSpeakingItem_Id(Integer attemptId, Integer speakingItemId);
}
