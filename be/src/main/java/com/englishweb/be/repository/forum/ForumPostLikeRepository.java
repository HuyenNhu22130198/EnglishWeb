package com.englishweb.be.repository.forum;

import com.englishweb.be.entity.forum.ForumPostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ForumPostLikeRepository extends JpaRepository<ForumPostLike, Integer> {

    long countByPostId(Integer postId);

    boolean existsByPostIdAndUserId(Integer postId, Integer userId);

    Optional<ForumPostLike> findByPostIdAndUserId(Integer postId, Integer userId);
}
