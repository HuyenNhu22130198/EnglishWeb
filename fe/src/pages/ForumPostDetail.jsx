import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDialog } from '../contexts/useConfirmDialog';
import { forumAPI } from '../services/forumService';
import { appendComment, updateCommentTree, removeCommentTree } from '../utils/forumCommentTree';
import ForumPostCard from '../components/forum/ForumPostCard';
import styles from './Forum.module.css';

const ForumPostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirmDialog();
  const { isAuthenticated, user } = useAuth();

  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPost = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await forumAPI.getPostDetail(id);
      setPost({ ...response.data, commentsLoaded: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải bài viết. Có thể bài viết đã bị xóa.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const requireLogin = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const handleLike = async () => {
    try {
      const response = await forumAPI.toggleLike(post.id);
      setPost((current) => ({ ...current, likeCount: response.data.likeCount, likedByCurrentUser: response.data.likedByCurrentUser }));
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể cập nhật lượt thích.');
    }
  };

  const handleSave = async () => {
    try {
      const response = await forumAPI.toggleSave(post.id);
      setPost((current) => ({ ...current, savedByCurrentUser: response.data.savedByCurrentUser }));
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể cập nhật lưu bài viết.');
    }
  };

  const handleEditSubmit = async (postId, payload) => {
    try {
      const response = await forumAPI.updatePost(postId, payload);
      setPost((current) => ({ ...current, ...response.data, comments: current.comments, commentsLoaded: true }));
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể sửa bài viết.');
    }
  };

  const handleDeletePost = async (postId) => {
    const confirmed = await confirm({
      title: 'Xóa bài viết?',
      message: 'Bài viết và toàn bộ bình luận bên dưới sẽ bị xóa vĩnh viễn.',
      confirmLabel: 'Xóa bài viết',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await forumAPI.deletePost(postId);
      navigate('/forum');
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể xóa bài viết.');
    }
  };

  const handleReportPost = async (postId, reason) => {
    try {
      await forumAPI.reportPost(postId, reason);
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể gửi báo cáo.');
    }
  };

  const handleReportComment = async (commentId, reason) => {
    try {
      await forumAPI.reportComment(commentId, reason);
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể gửi báo cáo.');
    }
  };

  const handleAddComment = async (postId, parentCommentId, content) => {
    try {
      const response = await forumAPI.addComment(postId, content, parentCommentId);
      setPost((current) => ({
        ...current,
        commentCount: current.commentCount + 1,
        comments: appendComment(current.comments || [], parentCommentId, response.data),
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể gửi bình luận.');
    }
  };

  const handleCommentLike = async (postId, commentId) => {
    try {
      const response = await forumAPI.toggleCommentLike(commentId);
      setPost((current) => ({
        ...current,
        comments: updateCommentTree(current.comments || [], commentId, (comment) => ({
          ...comment,
          likeCount: response.data.likeCount,
          likedByCurrentUser: response.data.likedByCurrentUser,
        })),
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể cập nhật lượt thích bình luận.');
    }
  };

  const handleUpdateComment = async (postId, commentId, content) => {
    try {
      const response = await forumAPI.updateComment(commentId, content);
      setPost((current) => ({
        ...current,
        comments: updateCommentTree(current.comments || [], commentId, (comment) => ({
          ...comment,
          content: response.data.content,
          updatedAt: response.data.updatedAt,
        })),
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể sửa bình luận.');
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    const confirmed = await confirm({
      title: 'Xóa bình luận?',
      message: 'Bình luận và tất cả câu trả lời bên dưới sẽ bị xóa. Thao tác này không thể hoàn tác.',
      confirmLabel: 'Xóa bình luận',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await forumAPI.deleteComment(commentId);
      setPost((current) => {
        const result = removeCommentTree(current.comments || [], commentId);
        return { ...current, commentCount: Math.max(0, current.commentCount - result.removedCount), comments: result.comments };
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể xóa bình luận.');
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.feed}>
        <Link to="/forum" className={styles.backLink}>
          ← Quay lại diễn đàn
        </Link>

        {error && <div className={styles.alert}>{error}</div>}

        {isLoading ? (
          <div className={styles.stateBox}>Đang tải bài viết...</div>
        ) : !post ? (
          <div className={styles.stateBox}>Không tìm thấy bài viết.</div>
        ) : (
          <div className={styles.postList}>
            <ForumPostCard
              post={post}
              currentUser={user}
              isDetail
              forceExpanded
              requireLogin={requireLogin}
              onLike={handleLike}
              onSave={handleSave}
              onEditSubmit={handleEditSubmit}
              onDeletePost={handleDeletePost}
              onReportPost={handleReportPost}
              onExpandComments={async () => {}}
              onAddComment={handleAddComment}
              onCommentLike={handleCommentLike}
              onUpdateComment={handleUpdateComment}
              onDeleteComment={handleDeleteComment}
              onReportComment={handleReportComment}
            />
          </div>
        )}
      </section>
    </main>
  );
};

export default ForumPostDetail;
