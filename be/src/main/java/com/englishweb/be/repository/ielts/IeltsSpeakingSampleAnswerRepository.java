package com.englishweb.be.repository.ielts;
import com.englishweb.be.entity.ielts.IeltsSpeakingSampleAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface IeltsSpeakingSampleAnswerRepository extends JpaRepository<IeltsSpeakingSampleAnswer, Integer> {
    List<IeltsSpeakingSampleAnswer> findBySpeakingTask_IdOrderByDisplayOrderAscIdAsc(Integer taskId);
}
