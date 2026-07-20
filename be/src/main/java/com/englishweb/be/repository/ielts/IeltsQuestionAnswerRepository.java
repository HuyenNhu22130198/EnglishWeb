package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsQuestionAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IeltsQuestionAnswerRepository extends JpaRepository<IeltsQuestionAnswer, Integer> {

    List<IeltsQuestionAnswer> findByQuestion_QuestionIdOrderByIdAsc(Integer questionId);

    List<IeltsQuestionAnswer> findByQuestion_QuestionIdInOrderByQuestion_QuestionIdAscIdAsc(List<Integer> questionIds);
}
