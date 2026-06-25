package com.englishweb.be.repository;

import com.englishweb.be.entity.Banner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BannerRepository extends JpaRepository<Banner, Long> {
    List<Banner> findByActiveTrueOrderByDisplayOrderAscIdAsc();
    List<Banner> findAllByOrderByDisplayOrderAscIdAsc();
}