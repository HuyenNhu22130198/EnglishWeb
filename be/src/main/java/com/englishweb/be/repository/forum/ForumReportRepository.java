package com.englishweb.be.repository.forum;

import com.englishweb.be.entity.forum.ForumReport;
import com.englishweb.be.entity.forum.ForumReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ForumReportRepository extends JpaRepository<ForumReport, Integer> {

    Page<ForumReport> findByStatusOrderByCreatedAtDesc(ForumReportStatus status, Pageable pageable);

    long countByPostIdAndStatus(Integer postId, ForumReportStatus status);

    void deleteByPostId(Integer postId);

    void deleteByCommentId(Integer commentId);
}
