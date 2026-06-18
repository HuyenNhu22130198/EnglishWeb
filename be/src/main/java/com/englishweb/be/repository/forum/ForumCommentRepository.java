package com.englishweb.be.repository.forum;

import com.englishweb.be.entity.forum.ForumComment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ForumCommentRepository extends JpaRepository<ForumComment, Integer> {

    @EntityGraph(attributePaths = {"author"})
    List<ForumComment> findByPostIdOrderByCreatedAtAsc(Integer postId);

    @EntityGraph(attributePaths = {"author"})
    List<ForumComment> findByParentCommentIdOrderByCreatedAtAsc(Integer parentCommentId);

    long countByPostId(Integer postId);
}
