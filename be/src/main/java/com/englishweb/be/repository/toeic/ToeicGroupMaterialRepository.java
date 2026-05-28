package com.englishweb.be.repository.toeic;

import com.englishweb.be.entity.toeic.ToeicGroupMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ToeicGroupMaterialRepository extends JpaRepository<ToeicGroupMaterial, Integer> {

    List<ToeicGroupMaterial> findByGroup_IdOrderByDisplayOrderAsc(Integer groupId);
}