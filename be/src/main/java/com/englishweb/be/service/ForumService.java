package com.englishweb.be.service;

import com.englishweb.be.dto.forum.ForumAuthorResponse;
import com.englishweb.be.dto.forum.ForumCommentRequest;
import com.englishweb.be.dto.forum.ForumCommentResponse;
import com.englishweb.be.dto.forum.ForumPostRequest;
import com.englishweb.be.dto.forum.ForumPostResponse;
import com.englishweb.be.entity.User;
import com.englishweb.be.entity.forum.ForumComment;
import com.englishweb.be.entity.forum.ForumCommentLike;
import com.englishweb.be.entity.forum.ForumPost;
import com.englishweb.be.entity.forum.ForumPostLike;
import com.englishweb.be.repository.UserRepository;
import com.englishweb.be.repository.forum.ForumCommentLikeRepository;
import com.englishweb.be.repository.forum.ForumCommentRepository;
import com.englishweb.be.repository.forum.ForumPostLikeRepository;
import com.englishweb.be.repository.forum.ForumPostRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ForumService {

    private final ForumPostRepository postRepository;
    private final ForumCommentRepository commentRepository;
    private final ForumCommentLikeRepository commentLikeRepository;
    private final ForumPostLikeRepository likeRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ForumPostResponse> getPosts(String currentUserEmail) {
        User currentUser = findCurrentUserOrNull(currentUserEmail);
        return postRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(post -> toPostResponse(post, currentUser, true))
                .toList();
    }

    @Transactional
    public ForumPostResponse createPost(String email, ForumPostRequest request) {
        User author = getUserByEmail(email);
        ForumPost post = ForumPost.builder()
                .author(author)
                .title(request.getTitle().trim())
                .content(request.getContent().trim())
                .build();

        return toPostResponse(postRepository.save(post), author, true);
    }

    @Transactional
    public ForumPostResponse toggleLike(String email, Integer postId) {
        User user = getUserByEmail(email);
        ForumPost post = getPost(postId);
        Optional<ForumPostLike> existingLike = likeRepository.findByPostIdAndUserId(postId, user.getId());

        if (existingLike.isPresent()) {
            likeRepository.delete(existingLike.get());
        } else {
            likeRepository.save(ForumPostLike.builder().post(post).user(user).build());
        }

        likeRepository.flush();

        return toPostResponse(post, user, true);
    }

    @Transactional
    public ForumCommentResponse addComment(String email, Integer postId, ForumCommentRequest request) {
        User author = getUserByEmail(email);
        ForumPost post = getPost(postId);
        ForumComment parentComment = getParentCommentOrNull(request.getParentCommentId(), postId);
        ForumComment comment = ForumComment.builder()
                .post(post)
                .author(author)
                .parentComment(parentComment)
                .content(request.getContent().trim())
                .build();

        return toCommentResponse(commentRepository.save(comment), author);
    }

    @Transactional
    public ForumCommentResponse updateComment(String email, Integer commentId, ForumCommentRequest request) {
        User user = getUserByEmail(email);
        ForumComment comment = getComment(commentId);
        ensureCommentOwner(comment, user);

        comment.setContent(request.getContent().trim());
        comment.setUpdatedAt(LocalDateTime.now());

        return toCommentResponse(commentRepository.save(comment), user);
    }

    @Transactional
    public void deleteComment(String email, Integer commentId) {
        User user = getUserByEmail(email);
        ForumComment comment = getComment(commentId);
        ensureCommentOwner(comment, user);
        deleteCommentTree(comment);
    }

    @Transactional
    public ForumCommentResponse toggleCommentLike(String email, Integer commentId) {
        User user = getUserByEmail(email);
        ForumComment comment = getComment(commentId);
        Optional<ForumCommentLike> existingLike = commentLikeRepository.findByCommentIdAndUserId(commentId, user.getId());

        if (existingLike.isPresent()) {
            commentLikeRepository.delete(existingLike.get());
        } else {
            commentLikeRepository.save(ForumCommentLike.builder().comment(comment).user(user).build());
        }

        commentLikeRepository.flush();

        return toCommentResponse(comment, user);
    }

    private ForumPost getPost(Integer postId) {
        return postRepository.findWithAuthorById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Post not found"));
    }

    private ForumComment getComment(Integer commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new EntityNotFoundException("Comment not found"));
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
    }

    private ForumComment getParentCommentOrNull(Integer parentCommentId, Integer postId) {
        if (parentCommentId == null) {
            return null;
        }

        ForumComment parentComment = commentRepository.findById(parentCommentId)
                .orElseThrow(() -> new EntityNotFoundException("Comment not found"));

        if (!parentComment.getPost().getId().equals(postId)) {
            throw new IllegalArgumentException("Comment does not belong to this post");
        }

        return parentComment;
    }

    private void ensureCommentOwner(ForumComment comment, User user) {
        if (!comment.getAuthor().getId().equals(user.getId())) {
            throw new IllegalArgumentException("You can only edit or delete your own comment");
        }
    }

    private void deleteCommentTree(ForumComment comment) {
        commentRepository.findByParentCommentIdOrderByCreatedAtAsc(comment.getId())
                .forEach(this::deleteCommentTree);
        commentLikeRepository.deleteByCommentId(comment.getId());
        commentRepository.delete(comment);
    }

    private User findCurrentUserOrNull(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(email).orElse(null);
    }

    private ForumPostResponse toPostResponse(ForumPost post, User currentUser, boolean includeComments) {
        Integer currentUserId = currentUser == null ? null : currentUser.getId();
        List<ForumCommentResponse> comments = includeComments ? buildCommentTree(post.getId(), currentUser) : List.of();

        return ForumPostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .author(toAuthorResponse(post.getAuthor()))
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .likeCount(likeRepository.countByPostId(post.getId()))
                .commentCount(commentRepository.countByPostId(post.getId()))
                .likedByCurrentUser(currentUserId != null && likeRepository.existsByPostIdAndUserId(post.getId(), currentUserId))
                .comments(comments)
                .build();
    }

    private ForumCommentResponse toCommentResponse(ForumComment comment, User currentUser) {
        Integer currentUserId = currentUser == null ? null : currentUser.getId();

        return ForumCommentResponse.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .author(toAuthorResponse(comment.getAuthor()))
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .parentCommentId(comment.getParentComment() == null ? null : comment.getParentComment().getId())
                .likeCount(commentLikeRepository.countByCommentId(comment.getId()))
                .likedByCurrentUser(currentUserId != null && commentLikeRepository.existsByCommentIdAndUserId(comment.getId(), currentUserId))
                .replies(new ArrayList<>())
                .build();
    }

    private List<ForumCommentResponse> buildCommentTree(Integer postId, User currentUser) {
        List<ForumComment> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
        Map<Integer, ForumCommentResponse> responseById = new LinkedHashMap<>();
        List<ForumCommentResponse> roots = new ArrayList<>();

        comments.forEach(comment -> responseById.put(comment.getId(), toCommentResponse(comment, currentUser)));

        comments.forEach(comment -> {
            ForumCommentResponse response = responseById.get(comment.getId());
            Integer parentId = comment.getParentComment() == null ? null : comment.getParentComment().getId();

            if (parentId == null || !responseById.containsKey(parentId)) {
                roots.add(response);
            } else {
                responseById.get(parentId).getReplies().add(response);
            }
        });

        return roots;
    }

    private ForumAuthorResponse toAuthorResponse(User user) {
        String displayName = user.getFullName() == null || user.getFullName().isBlank()
                ? user.getUsername()
                : user.getFullName();
        String initial = displayName == null || displayName.isBlank()
                ? "U"
                : displayName.substring(0, 1).toUpperCase();

        return ForumAuthorResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(displayName)
                .initial(initial)
                .build();
    }
}
