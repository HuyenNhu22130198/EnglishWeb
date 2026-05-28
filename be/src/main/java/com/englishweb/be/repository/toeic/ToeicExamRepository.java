package com.englishweb.be.repository.toeic;

import com.englishweb.be.entity.toeic.ToeicExam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ToeicExamRepository extends JpaRepository<ToeicExam, Integer> {

    List<ToeicExam> findAllByOrderByIdAsc();

    @Query("""
            SELECT e
            FROM ToeicExam e
            WHERE LOWER(e.examCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(e.examName) LIKE LOWER(CONCAT('%', :keyword, '%'))
            ORDER BY e.id ASC
            """)
    List<ToeicExam> searchByKeyword(@Param("keyword") String keyword);
}