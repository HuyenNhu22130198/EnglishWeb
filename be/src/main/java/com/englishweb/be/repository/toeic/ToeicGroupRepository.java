package com.englishweb.be.repository.toeic;

import com.englishweb.be.entity.toeic.ToeicGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ToeicGroupRepository extends JpaRepository<ToeicGroup, Integer> {

    List<ToeicGroup> findByExam_IdOrderByPartNoAscGroupNoAscIdAsc(Integer examId);
}