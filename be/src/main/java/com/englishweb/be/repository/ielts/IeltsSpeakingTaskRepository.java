package com.englishweb.be.repository.ielts;
import com.englishweb.be.entity.ielts.IeltsSpeakingTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface IeltsSpeakingTaskRepository extends JpaRepository<IeltsSpeakingTask, Integer> {
    List<IeltsSpeakingTask> findByExam_IdOrderByPartNoAscDisplayOrderAscIdAsc(Integer examId);
}
