package com.englishweb.be.repository.forum;

import com.englishweb.be.entity.forum.ForumPost;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ForumPostRepository extends JpaRepository<ForumPost, Integer> {

    @EntityGraph(attributePaths = {"author"})
    List<ForumPost> findAllByOrderByCreatedAtDesc();

    @Query("select p from ForumPost p join fetch p.author where p.id = :id")
    Optional<ForumPost> findWithAuthorById(Integer id);
}
