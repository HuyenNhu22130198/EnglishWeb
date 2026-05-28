package com.englishweb.be.repository.toeic;

import com.englishweb.be.entity.toeic.ToeicQuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ToeicQuestionOptionRepository extends JpaRepository<ToeicQuestionOption, Integer> {

    List<ToeicQuestionOption> findByQuestion_IdOrderByDisplayOrderAsc(Integer questionId);

    List<ToeicQuestionOption> findByQuestion_IdInOrderByQuestion_IdAscDisplayOrderAsc(List<Integer> questionIds);

    Optional<ToeicQuestionOption> findByQuestion_IdAndOptionLabelIgnoreCase(
            Integer questionId,
            String optionLabel
    );
}
