package com.englishweb.be.repository.forum;

import com.englishweb.be.entity.forum.ForumPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ForumPostRepository extends JpaRepository<ForumPost, Integer> {

    @Query("select p from ForumPost p where (:category is null or p.category = :category) " +
            "and (:keyword is null or lower(p.title) like :keyword or lower(p.content) like :keyword) " +
            "order by p.createdAt desc")
    @EntityGraph(attributePaths = {"author"})
    Page<ForumPost> searchNewest(@Param("category") String category, @Param("keyword") String keyword, Pageable pageable);

    @Query("select p from ForumPost p left join ForumPostLike l on l.post = p " +
            "where (:category is null or p.category = :category) " +
            "and (:keyword is null or lower(p.title) like :keyword or lower(p.content) like :keyword) " +
            "group by p order by count(l) desc, p.createdAt desc")
    Page<ForumPost> searchMostLiked(@Param("category") String category, @Param("keyword") String keyword, Pageable pageable);

    @Query("select p from ForumPost p left join ForumComment c on c.post = p " +
            "where (:category is null or p.category = :category) " +
            "and (:keyword is null or lower(p.title) like :keyword or lower(p.content) like :keyword) " +
            "group by p order by count(c) desc, p.createdAt desc")
    Page<ForumPost> searchMostCommented(@Param("category") String category, @Param("keyword") String keyword, Pageable pageable);

    @Query("select p from ForumPost p join fetch p.author where p.id = :id")
    Optional<ForumPost> findWithAuthorById(Integer id);
}
