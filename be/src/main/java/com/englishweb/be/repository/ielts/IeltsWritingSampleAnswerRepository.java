package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsWritingSampleAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface IeltsWritingSampleAnswerRepository extends JpaRepository<IeltsWritingSampleAnswer, Integer> {

    List<IeltsWritingSampleAnswer> findByTask_IdOrderByDisplayOrderAscIdAsc(Integer taskId);

    Optional<IeltsWritingSampleAnswer> findFirstByTask_IdOrderByDisplayOrderAscIdAsc(Integer taskId);

    Optional<IeltsWritingSampleAnswer> findFirstByTask_IdAndDisplayOrderOrderByIdAsc(Integer taskId, Integer displayOrder);
}
