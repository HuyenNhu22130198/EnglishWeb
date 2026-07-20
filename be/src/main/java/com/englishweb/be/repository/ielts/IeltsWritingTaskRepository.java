package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsWritingTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IeltsWritingTaskRepository extends JpaRepository<IeltsWritingTask, Integer> {
    List<IeltsWritingTask> findByExam_IdOrderByTaskNoAscDisplayOrderAscIdAsc(Integer examId);
}
