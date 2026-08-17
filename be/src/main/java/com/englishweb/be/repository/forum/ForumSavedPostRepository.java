package com.englishweb.be.repository.forum;

import com.englishweb.be.entity.forum.ForumSavedPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ForumSavedPostRepository extends JpaRepository<ForumSavedPost, Integer> {

    boolean existsByPostIdAndUserId(Integer postId, Integer userId);

    Optional<ForumSavedPost> findByPostIdAndUserId(Integer postId, Integer userId);

    @EntityGraph(attributePaths = {"post", "post.author"})
    Page<ForumSavedPost> findByUserIdOrderByCreatedAtDesc(Integer userId, Pageable pageable);

    void deleteByPostId(Integer postId);
}
