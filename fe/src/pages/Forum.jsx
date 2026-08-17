import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDialog } from '../contexts/useConfirmDialog';
import { forumAPI, FORUM_CATEGORY_LABELS } from '../services/forumService';
import { appendComment, updateCommentTree, removeCommentTree } from '../utils/forumCommentTree';
import ForumPostCard from '../components/forum/ForumPostCard';
import styles from './Forum.module.css';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tất cả chủ đề' },
  ...Object.entries(FORUM_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
];

const SORT_OPTIONS = [
  { value: 'NEWEST', label: 'Mới nhất' },
  { value: 'MOST_LIKED', label: 'Nhiều lượt thích nhất' },
  { value: 'MOST_COMMENTED', label: 'Nhiều bình luận nhất' },
];

const emptyDraft = { title: '', content: '', category: 'KHAC' };

const Forum = () => {
  const confirm = useConfirmDialog();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 0, hasMore: false, totalItems: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('NEWEST');

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [submitting, setSubmitting] = useState(false);

  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [savedPosts, setSavedPosts] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const userInitial = useMemo(() => {
    const name = user?.fullName || user?.username || 'U';
    return name.charAt(0).toUpperCase();
  }, [user]);

  const fetchPosts = useCallback(
    async (page, replace) => {
      if (page === 0) setIsLoading(true);
      else setIsLoadingMore(true);
      setError('');

      try {
        const response = await forumAPI.getPosts({ page, size: 10, category, keyword, sort });
        const data = response.data;
        setPosts((current) => (replace ? data.items : [...current, ...data.items]));
        setPageInfo({ page: data.page, hasMore: data.hasMore, totalItems: data.totalItems });
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải diễn đàn.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [category, keyword, sort]
  );

  useEffect(() => {
    fetchPosts(0, true);
  }, [fetchPosts]);

  const requireLogin = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const openComposer = () => {
    if (!requireLogin()) return;
    setDraft(emptyDraft);
    setIsComposerOpen(true);
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();
    if (!requireLogin()) return;

    const title = draft.title.trim();
    const content = draft.content.trim();
    if (!title || !content) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await forumAPI.createPost({ title, content, category: draft.category });
      setPosts((current) => [{ ...response.data, commentsLoaded: true }, ...current]);
      setDraft(emptyDraft);
      setIsComposerOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể đăng bài viết.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (postId, payload) => {
    try {
      const response = await forumAPI.updatePost(postId, payload);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, ...response.data, comments: post.comments, commentsLoaded: post.commentsLoaded }
            : post
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể lưu bài viết.');
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
      setPosts((current) => current.filter((post) => post.id !== postId));
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể xóa bài viết.');
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await forumAPI.toggleLike(postId);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, likeCount: response.data.likeCount, likedByCurrentUser: response.data.likedByCurrentUser }
            : post
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể cập nhật lượt thích.');
    }
  };

  const handleSave = async (postId) => {
    try {
      const response = await forumAPI.toggleSave(postId);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId ? { ...post, savedByCurrentUser: response.data.savedByCurrentUser } : post
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể cập nhật lưu bài viết.');
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

  const handleExpandComments = async (postId) => {
    try {
      const response = await forumAPI.getPostDetail(postId);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId ? { ...post, comments: response.data.comments, commentsLoaded: true } : post
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể tải bình luận.');
    }
  };

  const handleAddComment = async (postId, parentCommentId, content) => {
    try {
      const response = await forumAPI.addComment(postId, content, parentCommentId);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                commentCount: post.commentCount + 1,
                comments: appendComment(post.comments || [], parentCommentId, response.data),
              }
            : post
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể gửi bình luận.');
    }
  };

  const handleCommentLike = async (postId, commentId) => {
    try {
      const response = await forumAPI.toggleCommentLike(commentId);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: updateCommentTree(post.comments || [], commentId, (comment) => ({
                  ...comment,
                  likeCount: response.data.likeCount,
                  likedByCurrentUser: response.data.likedByCurrentUser,
                })),
              }
            : post
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể cập nhật lượt thích bình luận.');
    }
  };

  const handleUpdateComment = async (postId, commentId, content) => {
    try {
      const response = await forumAPI.updateComment(commentId, content);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: updateCommentTree(post.comments || [], commentId, (comment) => ({
                  ...comment,
                  content: response.data.content,
                  updatedAt: response.data.updatedAt,
                })),
              }
            : post
        )
      );
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
      setPosts((current) =>
        current.map((post) => {
          if (post.id !== postId) return post;
          const result = removeCommentTree(post.comments || [], commentId);
          return { ...post, commentCount: Math.max(0, post.commentCount - result.removedCount), comments: result.comments };
        })
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể xóa bình luận.');
    }
  };

  const openSavedPosts = async () => {
    if (!requireLogin()) return;
    setIsSavedOpen(true);
    setSavedLoading(true);
    try {
      const response = await forumAPI.getSavedPosts({ page: 0, size: 20 });
      setSavedPosts(response.data.items);
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể tải danh sách bài đã lưu.');
    } finally {
      setSavedLoading(false);
    }
  };

  const handleUnsaveFromModal = async (postId) => {
    try {
      await forumAPI.toggleSave(postId);
      setSavedPosts((current) => current.filter((post) => post.id !== postId));
      setPosts((current) =>
        current.map((post) => (post.id === postId ? { ...post, savedByCurrentUser: false } : post))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể bỏ lưu bài viết.');
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setKeyword(searchInput.trim());
  };

  return (
    <main className={styles.page}>
      <section className={styles.feed}>
        <div className={styles.askBox}>
          <button type="button" className={styles.askInput} onClick={openComposer}>
            Bạn muốn đặt câu hỏi...
          </button>
          <button type="button" className={styles.newButton} onClick={openComposer}>
            <span aria-hidden="true">♡</span>
            Câu hỏi mới
          </button>
          <button type="button" className={styles.savedButton} onClick={openSavedPosts}>
            <span aria-hidden="true">★</span>
            Bài đã lưu
          </button>
        </div>

        <div className={styles.toolbar}>
          <form className={styles.toolbarSearch} onSubmit={handleSearchSubmit}>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm kiếm bài viết..."
            />
            <button type="submit" className={styles.toolbarSearchBtn}>
              Tìm
            </button>
          </form>

          <select className={styles.toolbarSelect} value={category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select className={styles.toolbarSelect} value={sort} onChange={(event) => setSort(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {isComposerOpen && (
          <form className={styles.composer} onSubmit={handleCreatePost}>
            <div className={styles.composerUser}>
              <span className={styles.avatar}>{userInitial}</span>
              <strong>{user?.fullName || user?.username}</strong>
            </div>
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Tiêu đề câu hỏi"
              maxLength={160}
            />
            <textarea
              value={draft.content}
              onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
              placeholder="Nội dung bạn muốn chia sẻ hoặc thảo luận"
              rows={5}
              maxLength={5000}
            />
            <div className={styles.postFormRow}>
              <select
                className={styles.toolbarSelect}
                value={draft.category}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
              >
                {CATEGORY_OPTIONS.filter((option) => option.value).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.composerActions}>
              <button type="button" onClick={() => setIsComposerOpen(false)}>
                Hủy
              </button>
              <button type="submit" disabled={submitting || !draft.title.trim() || !draft.content.trim()}>
                Đăng bài
              </button>
            </div>
          </form>
        )}

        {error && <div className={styles.alert}>{error}</div>}

        {isLoading ? (
          <div className={styles.stateBox}>Đang tải bài viết...</div>
        ) : posts.length === 0 ? (
          <div className={styles.stateBox}>Chưa có bài viết nào phù hợp. Hãy là người mở đầu cuộc thảo luận.</div>
        ) : (
          <>
            <div className={styles.postList}>
              {posts.map((post) => (
                <ForumPostCard
                  key={post.id}
                  post={post}
                  currentUser={user}
                  requireLogin={requireLogin}
                  onLike={handleLike}
                  onSave={handleSave}
                  onEditSubmit={handleEditSubmit}
                  onDeletePost={handleDeletePost}
                  onReportPost={handleReportPost}
                  onExpandComments={handleExpandComments}
                  onAddComment={handleAddComment}
                  onCommentLike={handleCommentLike}
                  onUpdateComment={handleUpdateComment}
                  onDeleteComment={handleDeleteComment}
                  onReportComment={handleReportComment}
                />
              ))}
            </div>

            {pageInfo.hasMore && (
              <div className={styles.loadMoreWrap}>
                <button
                  type="button"
                  className={styles.loadMoreBtn}
                  onClick={() => fetchPosts(pageInfo.page + 1, false)}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Đang tải...' : 'Xem thêm bài viết'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {isSavedOpen && (
        <div role="presentation" className={styles.modalOverlay} onClick={() => setIsSavedOpen(false)}>
          <div role="dialog" aria-modal="true" className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <strong>Bài viết đã lưu</strong>
              <button type="button" className={styles.modalClose} onClick={() => setIsSavedOpen(false)} aria-label="Đóng">
                ×
              </button>
            </div>

            {savedLoading ? (
              <div className={styles.stateBox}>Đang tải...</div>
            ) : savedPosts.length === 0 ? (
              <div className={styles.stateBox}>Bạn chưa lưu bài viết nào.</div>
            ) : (
              <div className={styles.savedList}>
                {savedPosts.map((post) => (
                  <div key={post.id} className={styles.savedItem}>
                    <Link to={`/forum/posts/${post.id}`} onClick={() => setIsSavedOpen(false)}>
                      {post.title}
                    </Link>
                    <p>
                      {post.content.slice(0, 120)}
                      {post.content.length > 120 ? '…' : ''}
                    </p>
                    <button type="button" className={styles.unsaveBtn} onClick={() => handleUnsaveFromModal(post.id)}>
                      Bỏ lưu
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default Forum;
