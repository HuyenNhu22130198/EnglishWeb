package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsQuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IeltsQuestionOptionRepository extends JpaRepository<IeltsQuestionOption, Integer> {

    List<IeltsQuestionOption> findByQuestion_QuestionIdOrderByDisplayOrderAscIdAsc(Integer questionId);

    List<IeltsQuestionOption> findByQuestion_QuestionIdInOrderByQuestion_QuestionIdAscDisplayOrderAscIdAsc(List<Integer> questionIds);

    Optional<IeltsQuestionOption> findByQuestion_QuestionIdAndOptionKeyIgnoreCase(Integer questionId, String optionKey);
}
