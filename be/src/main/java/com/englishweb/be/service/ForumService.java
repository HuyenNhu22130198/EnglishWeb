package com.englishweb.be.service;

import com.englishweb.be.dto.forum.ForumAuthorResponse;
import com.englishweb.be.dto.forum.ForumCommentRequest;
import com.englishweb.be.dto.forum.ForumCommentResponse;
import com.englishweb.be.dto.forum.ForumPageResponse;
import com.englishweb.be.dto.forum.ForumPostRequest;
import com.englishweb.be.dto.forum.ForumPostResponse;
import com.englishweb.be.dto.forum.ForumReportResponse;
import com.englishweb.be.entity.User;
import com.englishweb.be.entity.forum.ForumComment;
import com.englishweb.be.entity.forum.ForumCommentLike;
import com.englishweb.be.entity.forum.ForumPost;
import com.englishweb.be.entity.forum.ForumPostLike;
import com.englishweb.be.entity.forum.ForumReport;
import com.englishweb.be.entity.forum.ForumReportStatus;
import com.englishweb.be.entity.forum.ForumReportTargetType;
import com.englishweb.be.entity.forum.ForumSavedPost;
import com.englishweb.be.repository.UserRepository;
import com.englishweb.be.repository.forum.ForumCommentLikeRepository;
import com.englishweb.be.repository.forum.ForumCommentRepository;
import com.englishweb.be.repository.forum.ForumPostLikeRepository;
import com.englishweb.be.repository.forum.ForumPostRepository;
import com.englishweb.be.repository.forum.ForumReportRepository;
import com.englishweb.be.repository.forum.ForumSavedPostRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ForumService {

    public static final List<String> CATEGORIES = List.of("NGU_PHAP", "TU_VUNG", "KY_NANG", "IELTS", "TOEIC", "KHAC");
    private static final Pattern MENTION_PATTERN = Pattern.compile("@([a-zA-Z0-9_.]{3,50})");

    private final ForumPostRepository postRepository;
    private final ForumCommentRepository commentRepository;
    private final ForumCommentLikeRepository commentLikeRepository;
    private final ForumPostLikeRepository likeRepository;
    private final ForumSavedPostRepository savedPostRepository;
    private final ForumReportRepository reportRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public ForumPageResponse<ForumPostResponse> getPosts(String currentUserEmail, int page, int size,
                                                           String category, String keyword, String sort) {
        User currentUser = findCurrentUserOrNull(currentUserEmail);
        String normalizedCategory = normalizeCategory(category);
        String normalizedKeyword = (keyword == null || keyword.isBlank())
                ? null
                : "%" + keyword.trim().toLowerCase() + "%";
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(Math.min(size, 50), 1));

        Page<ForumPost> result = switch (sort == null ? "NEWEST" : sort.toUpperCase()) {
            case "MOST_LIKED" -> postRepository.searchMostLiked(normalizedCategory, normalizedKeyword, pageable);
            case "MOST_COMMENTED" -> postRepository.searchMostCommented(normalizedCategory, normalizedKeyword, pageable);
            default -> postRepository.searchNewest(normalizedCategory, normalizedKeyword, pageable);
        };

        List<ForumPostResponse> items = result.getContent().stream()
                .map(post -> toPostResponse(post, currentUser, false))
                .toList();

        return toPageResponse(items, result);
    }

    @Transactional(readOnly = true)
    public ForumPostResponse getPostDetail(String currentUserEmail, Integer postId) {
        User currentUser = findCurrentUserOrNull(currentUserEmail);
        ForumPost post = getPost(postId);
        return toPostResponse(post, currentUser, true);
    }

    @Transactional
    public ForumPostResponse createPost(String email, ForumPostRequest request) {
        User author = getUserByEmail(email);
        ForumPost post = ForumPost.builder()
                .author(author)
                .title(request.getTitle().trim())
                .content(request.getContent().trim())
                .category(normalizeCategoryOrDefault(request.getCategory()))
                .build();

        return toPostResponse(postRepository.save(post), author, true);
    }

    @Transactional
    public ForumPostResponse updatePost(String email, Integer postId, ForumPostRequest request) {
        User user = getUserByEmail(email);
        ForumPost post = getPost(postId);
        ensurePostOwner(post, user);

        post.setTitle(request.getTitle().trim());
        post.setContent(request.getContent().trim());
        post.setCategory(normalizeCategoryOrDefault(request.getCategory()));
        post.setUpdatedAt(LocalDateTime.now());

        return toPostResponse(postRepository.save(post), user, true);
    }

    @Transactional
    public void deletePost(String email, Integer postId) {
        User user = getUserByEmail(email);
        ForumPost post = getPost(postId);
        ensurePostOwner(post, user);
        deletePostCascade(post);
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

        return toPostResponse(post, user, false);
    }

    @Transactional
    public ForumPostResponse toggleSavePost(String email, Integer postId) {
        User user = getUserByEmail(email);
        ForumPost post = getPost(postId);
        Optional<ForumSavedPost> existing = savedPostRepository.findByPostIdAndUserId(postId, user.getId());

        if (existing.isPresent()) {
            savedPostRepository.delete(existing.get());
        } else {
            savedPostRepository.save(ForumSavedPost.builder().post(post).user(user).build());
        }

        savedPostRepository.flush();

        return toPostResponse(post, user, false);
    }

    @Transactional(readOnly = true)
    public ForumPageResponse<ForumPostResponse> getSavedPosts(String email, int page, int size) {
        User user = getUserByEmail(email);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(Math.min(size, 50), 1));
        Page<ForumSavedPost> result = savedPostRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);

        List<ForumPostResponse> items = result.getContent().stream()
                .map(saved -> toPostResponse(saved.getPost(), user, false))
                .toList();

        return toPageResponse(items, result);
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

        ForumComment saved = commentRepository.save(comment);
        sendReplyAndMentionNotifications(post, saved, parentComment, author);

        return toCommentResponse(saved, author);
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

    @Transactional
    public void reportPost(String email, Integer postId, String reason) {
        User reporter = getUserByEmail(email);
        ForumPost post = getPost(postId);
        reportRepository.save(ForumReport.builder()
                .targetType(ForumReportTargetType.POST)
                .postId(post.getId())
                .reporter(reporter)
                .reason(reason.trim())
                .build());
    }

    @Transactional
    public void reportComment(String email, Integer commentId, String reason) {
        User reporter = getUserByEmail(email);
        ForumComment comment = getComment(commentId);
        reportRepository.save(ForumReport.builder()
                .targetType(ForumReportTargetType.COMMENT)
                .postId(comment.getPost().getId())
                .commentId(comment.getId())
                .reporter(reporter)
                .reason(reason.trim())
                .build());
    }

    // ----- Admin moderation -----

    @Transactional(readOnly = true)
    public ForumPageResponse<ForumPostResponse> adminGetPosts(int page, int size, String category, String keyword, String sort) {
        String normalizedCategory = normalizeCategory(category);
        String normalizedKeyword = (keyword == null || keyword.isBlank())
                ? null
                : "%" + keyword.trim().toLowerCase() + "%";
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(Math.min(size, 100), 1));

        Page<ForumPost> result = switch (sort == null ? "NEWEST" : sort.toUpperCase()) {
            case "MOST_LIKED" -> postRepository.searchMostLiked(normalizedCategory, normalizedKeyword, pageable);
            case "MOST_COMMENTED" -> postRepository.searchMostCommented(normalizedCategory, normalizedKeyword, pageable);
            default -> postRepository.searchNewest(normalizedCategory, normalizedKeyword, pageable);
        };

        List<ForumPostResponse> items = result.getContent().stream()
                .map(post -> {
                    ForumPostResponse response = toPostResponse(post, null, false);
                    response.setReportCount(reportRepository.countByPostIdAndStatus(post.getId(), ForumReportStatus.PENDING));
                    return response;
                })
                .toList();

        return toPageResponse(items, result);
    }

    @Transactional
    public void adminDeletePost(Integer postId) {
        ForumPost post = getPost(postId);
        deletePostCascade(post);
    }

    @Transactional
    public void adminDeleteComment(Integer commentId) {
        ForumComment comment = getComment(commentId);
        deleteCommentTree(comment);
    }

    @Transactional(readOnly = true)
    public ForumPageResponse<ForumReportResponse> adminGetReports(String status, int page, int size) {
        ForumReportStatus targetStatus = status == null || status.isBlank()
                ? ForumReportStatus.PENDING
                : ForumReportStatus.valueOf(status.toUpperCase());
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(Math.min(size, 100), 1));
        Page<ForumReport> result = reportRepository.findByStatusOrderByCreatedAtDesc(targetStatus, pageable);

        List<ForumReportResponse> items = result.getContent().stream().map(this::toReportResponse).toList();

        return toPageResponse(items, result);
    }

    @Transactional
    public void adminResolveReport(Integer reportId, boolean deleteTarget) {
        ForumReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found"));

        if (deleteTarget) {
            if (report.getTargetType() == ForumReportTargetType.POST) {
                postRepository.findById(report.getPostId()).ifPresent(this::deletePostCascade);
            } else {
                commentRepository.findById(report.getCommentId()).ifPresent(this::deleteCommentTree);
            }
        }

        report.setStatus(ForumReportStatus.RESOLVED);
        reportRepository.save(report);
    }

    @Transactional
    public void adminDismissReport(Integer reportId) {
        ForumReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found"));
        report.setStatus(ForumReportStatus.DISMISSED);
        reportRepository.save(report);
    }

    // ----- Internal helpers -----

    private void deletePostCascade(ForumPost post) {
        List<ForumComment> rootComments = commentRepository.findByPostIdOrderByCreatedAtAsc(post.getId()).stream()
                .filter(comment -> comment.getParentComment() == null)
                .toList();
        rootComments.forEach(this::deleteCommentTree);

        likeRepository.deleteByPostId(post.getId());
        savedPostRepository.deleteByPostId(post.getId());
        reportRepository.deleteByPostId(post.getId());
        postRepository.delete(post);
    }

    private void sendReplyAndMentionNotifications(ForumPost post, ForumComment comment, ForumComment parentComment, User commenter) {
        Set<Integer> notifiedUserIds = new LinkedHashSet<>();
        notifiedUserIds.add(commenter.getId());

        User replyTarget = parentComment != null ? parentComment.getAuthor() : post.getAuthor();
        if (!notifiedUserIds.contains(replyTarget.getId()) && Boolean.TRUE.equals(replyTarget.getNotifyForumReplies())) {
            String message = parentComment != null
                    ? commenter.getFullName() + " đã trả lời bình luận của bạn trong bài \"" + post.getTitle() + "\""
                    : commenter.getFullName() + " đã bình luận về bài viết \"" + post.getTitle() + "\" của bạn";
            notificationService.notify(replyTarget, "FORUM_REPLY", message, "/forum/posts/" + post.getId());
            notifiedUserIds.add(replyTarget.getId());
        }

        Matcher matcher = MENTION_PATTERN.matcher(comment.getContent());
        Set<String> usernames = new LinkedHashSet<>();
        while (matcher.find()) {
            usernames.add(matcher.group(1));
        }

        for (String username : usernames) {
            userRepository.findByUsername(username).ifPresent(mentioned -> {
                if (!notifiedUserIds.contains(mentioned.getId()) && Boolean.TRUE.equals(mentioned.getNotifyForumMentions())) {
                    String message = commenter.getFullName() + " đã nhắc đến bạn trong bài \"" + post.getTitle() + "\"";
                    notificationService.notify(mentioned, "FORUM_MENTION", message, "/forum/posts/" + post.getId());
                    notifiedUserIds.add(mentioned.getId());
                }
            });
        }
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank() || "ALL".equalsIgnoreCase(category)) {
            return null;
        }
        String upper = category.trim().toUpperCase();
        return CATEGORIES.contains(upper) ? upper : null;
    }

    private String normalizeCategoryOrDefault(String category) {
        String normalized = normalizeCategory(category);
        return normalized == null ? "KHAC" : normalized;
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

    private void ensurePostOwner(ForumPost post, User user) {
        if (!post.getAuthor().getId().equals(user.getId())) {
            throw new IllegalArgumentException("You can only edit or delete your own post");
        }
    }

    private void deleteCommentTree(ForumComment comment) {
        commentRepository.findByParentCommentIdOrderByCreatedAtAsc(comment.getId())
                .forEach(this::deleteCommentTree);
        commentLikeRepository.deleteByCommentId(comment.getId());
        reportRepository.deleteByCommentId(comment.getId());
        commentRepository.delete(comment);
    }

    private User findCurrentUserOrNull(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(email).orElse(null);
    }

    private <T> ForumPageResponse<T> toPageResponse(List<T> items, Page<?> page) {
        return ForumPageResponse.<T>builder()
                .items(items)
                .page(page.getNumber())
                .size(page.getSize())
                .totalItems(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .hasMore(page.hasNext())
                .build();
    }

    private ForumPostResponse toPostResponse(ForumPost post, User currentUser, boolean includeComments) {
        Integer currentUserId = currentUser == null ? null : currentUser.getId();
        List<ForumCommentResponse> comments = includeComments ? buildCommentTree(post.getId(), currentUser) : List.of();

        return ForumPostResponse.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .category(post.getCategory() == null ? "KHAC" : post.getCategory())
                .author(toAuthorResponse(post.getAuthor()))
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .likeCount(likeRepository.countByPostId(post.getId()))
                .commentCount(commentRepository.countByPostId(post.getId()))
                .likedByCurrentUser(currentUserId != null && likeRepository.existsByPostIdAndUserId(post.getId(), currentUserId))
                .savedByCurrentUser(currentUserId != null && savedPostRepository.existsByPostIdAndUserId(post.getId(), currentUserId))
                .comments(comments)
                .build();
    }

    private ForumCommentResponse toCommentResponse(ForumComment comment, User currentUser) {
        Integer currentUserId = currentUser == null ? null : currentUser.getId();

        return ForumCommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
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

    private ForumReportResponse toReportResponse(ForumReport report) {
        String postTitle = postRepository.findById(report.getPostId()).map(ForumPost::getTitle).orElse("(Bài viết đã bị xóa)");
        String commentContent = report.getCommentId() == null
                ? null
                : commentRepository.findById(report.getCommentId()).map(ForumComment::getContent).orElse("(Bình luận đã bị xóa)");

        return ForumReportResponse.builder()
                .id(report.getId())
                .targetType(report.getTargetType())
                .postId(report.getPostId())
                .postTitle(postTitle)
                .commentId(report.getCommentId())
                .commentContent(commentContent)
                .reporter(toAuthorResponse(report.getReporter()))
                .reason(report.getReason())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .build();
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
