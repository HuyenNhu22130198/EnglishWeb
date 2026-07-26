package com.englishweb.be.repository.ielts;

import com.englishweb.be.entity.ielts.IeltsExam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IeltsExamRepository extends JpaRepository<IeltsExam, Integer> {

    boolean existsByExamCodeIgnoreCaseAndIdNot(String examCode, Integer id);

    List<IeltsExam> findAllByOrderByIdAsc();

    @Query("""
            SELECT e
            FROM IeltsExam e
            WHERE LOWER(e.examCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(e.examName) LIKE LOWER(CONCAT('%', :keyword, '%'))
            ORDER BY e.id ASC
            """)
    List<IeltsExam> searchByKeyword(@Param("keyword") String keyword);
}
