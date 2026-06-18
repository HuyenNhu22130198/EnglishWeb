package com.englishweb.be.repository.forum;

import com.englishweb.be.entity.forum.ForumCommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ForumCommentLikeRepository extends JpaRepository<ForumCommentLike, Integer> {

    long countByCommentId(Integer commentId);

    boolean existsByCommentIdAndUserId(Integer commentId, Integer userId);

    Optional<ForumCommentLike> findByCommentIdAndUserId(Integer commentId, Integer userId);

    void deleteByCommentId(Integer commentId);
}
