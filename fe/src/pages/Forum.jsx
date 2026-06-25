import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { forumAPI } from '../services/forumService';
import styles from './Forum.module.css';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays <= 0) return 'Hôm nay';
  if (diffDays < 30) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
};

const resizeTextarea = (textarea) => {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
};

const AutoTextarea = ({ value, onChange, ...props }) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    resizeTextarea(textareaRef.current);
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => {
        onChange(event);
        resizeTextarea(event.target);
      }}
      rows={1}
      {...props}
    />
  );
};

const appendComment = (comments, parentCommentId, newComment) => {
  if (!parentCommentId) {
    return [...comments, newComment];
  }

  return comments.map((comment) => {
    if (comment.id === parentCommentId) {
      return {
        ...comment,
        replies: [...(comment.replies || []), newComment],
      };
    }

    return {
      ...comment,
      replies: appendComment(comment.replies || [], parentCommentId, newComment),
    };
  });
};

const updateCommentTree = (comments, commentId, updater) =>
  comments.map((comment) => {
    if (comment.id === commentId) {
      return updater(comment);
    }

    return {
      ...comment,
      replies: updateCommentTree(comment.replies || [], commentId, updater),
    };
  });

const countCommentTree = (comment) =>
  1 + (comment.replies || []).reduce((total, reply) => total + countCommentTree(reply), 0);

const removeCommentTree = (comments, commentId) =>
  comments.reduce(
    (result, comment) => {
      if (comment.id === commentId) {
        return {
          comments: result.comments,
          removedCount: result.removedCount + countCommentTree(comment),
        };
      }

      const nested = removeCommentTree(comment.replies || [], commentId);
      return {
        comments: [...result.comments, { ...comment, replies: nested.comments }],
        removedCount: result.removedCount + nested.removedCount,
      };
    },
    { comments: [], removedCount: 0 }
  );

const Forum = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [editDrafts, setEditDrafts] = useState({});
  const [activeReply, setActiveReply] = useState({});
  const [activeEdit, setActiveEdit] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const userInitial = useMemo(() => {
    const name = user?.fullName || user?.username || 'U';
    return name.charAt(0).toUpperCase();
  }, [user]);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await forumAPI.getPosts();
        setPosts(response.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải diễn đàn.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const requireLogin = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const openComposer = () => {
    if (requireLogin()) {
      setIsComposerOpen(true);
    }
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();
    if (!requireLogin()) return;

    const title = newPost.title.trim();
    const content = newPost.content.trim();
    if (!title || !content) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await forumAPI.createPost({ title, content });
      setPosts((current) => [response.data, ...current]);
      setNewPost({ title: '', content: '' });
      setIsComposerOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể đăng bài viết.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId) => {
    if (!requireLogin()) return;

    try {
      const response = await forumAPI.toggleLike(postId);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                likeCount: response.data.likeCount,
                likedByCurrentUser: response.data.likedByCurrentUser,
              }
            : post
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể cập nhật lượt thích.');
    }
  };

  const handleComment = async (event, postId, parentCommentId = null) => {
    event.preventDefault();
    if (!requireLogin()) return;

    const draftKey = parentCommentId || postId;
    const source = parentCommentId ? replyDrafts : commentDrafts;
    const content = (source[draftKey] || '').trim();
    if (!content) return;

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

      if (parentCommentId) {
        setReplyDrafts((current) => ({ ...current, [parentCommentId]: '' }));
        setActiveReply((current) => ({ ...current, [postId]: null }));
      } else {
        setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      }

      setExpandedComments((current) => ({ ...current, [postId]: true }));
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể gửi bình luận.');
    }
  };

  const handleCommentLike = async (commentId) => {
    if (!requireLogin()) return;

    try {
      const response = await forumAPI.toggleCommentLike(commentId);
      setPosts((current) =>
        current.map((post) => ({
          ...post,
          comments: updateCommentTree(post.comments || [], commentId, (comment) => ({
            ...comment,
            likeCount: response.data.likeCount,
            likedByCurrentUser: response.data.likedByCurrentUser,
          })),
        }))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể cập nhật lượt thích bình luận.');
    }
  };

  const startEditComment = (comment) => {
    setActiveEdit(comment.id);
    setEditDrafts((current) => ({ ...current, [comment.id]: comment.content }));
  };

  const handleUpdateComment = async (event, commentId) => {
    event.preventDefault();
    if (!requireLogin()) return;

    const content = (editDrafts[commentId] || '').trim();
    if (!content) return;

    try {
      const response = await forumAPI.updateComment(commentId, content);
      setPosts((current) =>
        current.map((post) => ({
          ...post,
          comments: updateCommentTree(post.comments || [], commentId, (comment) => ({
            ...comment,
            content: response.data.content,
            updatedAt: response.data.updatedAt,
          })),
        }))
      );
      setActiveEdit(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể sửa bình luận.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!requireLogin()) return;
    if (!window.confirm('Xóa bình luận này? Các trả lời bên dưới cũng sẽ bị xóa.')) return;

    try {
      await forumAPI.deleteComment(commentId);
      setPosts((current) =>
        current.map((post) => {
          const result = removeCommentTree(post.comments || [], commentId);
          return {
            ...post,
            commentCount: Math.max(0, post.commentCount - result.removedCount),
            comments: result.comments,
          };
        })
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa thể xóa bình luận.');
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments((current) => ({ ...current, [postId]: !current[postId] }));
  };

  const renderComment = (postId, comment, depth = 0) => {
    const replies = comment.replies || [];
    const isReplying = activeReply[postId] === comment.id;
    const isEditing = activeEdit === comment.id;
    const isOwnComment = String(comment.author?.id) === String(user?.id);

    return (
      <div key={comment.id} className={`${styles.commentThread} ${depth > 0 ? styles.replyThread : ''}`}>
        <div className={styles.comment}>
          <span className={styles.avatar}>{comment.author?.initial || 'U'}</span>
          <div className={styles.commentBody}>
            <div className={styles.commentBubble}>
              <div className={styles.commentInfo}>
                <strong>{comment.author?.fullName || comment.author?.username}</strong>
                <span>{formatDate(comment.createdAt)}</span>
              </div>

              {isEditing ? (
                <form className={styles.editForm} onSubmit={(event) => handleUpdateComment(event, comment.id)}>
                  <AutoTextarea
                    value={editDrafts[comment.id] || ''}
                    onChange={(event) =>
                      setEditDrafts((current) => ({ ...current, [comment.id]: event.target.value }))
                    }
                    placeholder="Sửa bình luận..."
                  />
                  <div className={styles.inlineActions}>
                    <button type="button" onClick={() => setActiveEdit(null)}>
                      Hủy
                    </button>
                    <button type="submit">Lưu</button>
                  </div>
                </form>
              ) : (
                <>
                  <p>{comment.content}</p>
                  {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                    <span className={styles.editedMark}>Đã chỉnh sửa</span>
                  )}
                </>
              )}
            </div>

            {!isEditing && (
              <div className={styles.commentActions}>
                <button
                  type="button"
                  className={comment.likedByCurrentUser ? styles.commentLiked : ''}
                  onClick={() => handleCommentLike(comment.id)}
                >
                  {comment.likedByCurrentUser ? 'Đã thích' : 'Thích'}
                </button>
                {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
                <button
                  type="button"
                  onClick={() => {
                    if (requireLogin()) {
                      setActiveReply((current) => ({ ...current, [postId]: isReplying ? null : comment.id }));
                    }
                  }}
                >
                  Trả lời
                </button>
                {isOwnComment && (
                  <>
                    <button type="button" onClick={() => startEditComment(comment)}>
                      Sửa
                    </button>
                    <button type="button" onClick={() => handleDeleteComment(comment.id)}>
                      Xóa
                    </button>
                  </>
                )}
              </div>
            )}

            {isReplying && (
              <form className={styles.replyForm} onSubmit={(event) => handleComment(event, postId, comment.id)}>
                <AutoTextarea
                  value={replyDrafts[comment.id] || ''}
                  onChange={(event) =>
                    setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))
                  }
                  placeholder={`Trả lời ${comment.author?.fullName || comment.author?.username || 'bình luận'}...`}
                />
                <button type="submit">Gửi</button>
              </form>
            )}
          </div>
        </div>

        {replies.length > 0 && (
          <div className={styles.replies}>
            {replies.map((reply) => renderComment(postId, reply, depth + 1))}
          </div>
        )}
      </div>
    );
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
        </div>

        {isComposerOpen && (
          <form className={styles.composer} onSubmit={handleCreatePost}>
            <div className={styles.composerUser}>
              <span className={styles.avatar}>{userInitial}</span>
              <strong>{user?.fullName || user?.username}</strong>
            </div>
            <input
              value={newPost.title}
              onChange={(event) => setNewPost((current) => ({ ...current, title: event.target.value }))}
              placeholder="Tiêu đề câu hỏi"
              maxLength={160}
            />
            <textarea
              value={newPost.content}
              onChange={(event) => setNewPost((current) => ({ ...current, content: event.target.value }))}
              placeholder="Nội dung bạn muốn chia sẻ hoặc thảo luận"
              rows={5}
              maxLength={5000}
            />
            <div className={styles.composerActions}>
              <button type="button" onClick={() => setIsComposerOpen(false)}>
                Hủy
              </button>
              <button type="submit" disabled={submitting || !newPost.title.trim() || !newPost.content.trim()}>
                Đăng bài
              </button>
            </div>
          </form>
        )}

        {error && <div className={styles.alert}>{error}</div>}

        {isLoading ? (
          <div className={styles.stateBox}>Đang tải bài viết...</div>
        ) : posts.length === 0 ? (
          <div className={styles.stateBox}>Chưa có bài viết nào. Hãy là người mở đầu cuộc thảo luận.</div>
        ) : (
          <div className={styles.postList}>
            {posts.map((post) => {
              const comments = post.comments || [];
              const showComments = !!expandedComments[post.id];

              return (
                <article key={post.id} className={styles.postCard}>
                  <div className={styles.postHeader}>
                    <span className={styles.avatar}>{post.author?.initial || 'U'}</span>
                    <div>
                      <strong>{post.author?.fullName || post.author?.username}</strong>
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>

                  <h2>{post.title}</h2>
                  <p>{post.content}</p>

                  <div className={styles.postMeta}>
                    <span>{post.likeCount} lượt thích</span>
                    <button type="button" onClick={() => toggleComments(post.id)}>
                      {post.commentCount} bình luận
                    </button>
                  </div>

                  <div className={styles.postActions}>
                    <button
                      type="button"
                      className={post.likedByCurrentUser ? styles.liked : ''}
                      onClick={() => handleLike(post.id)}
                      aria-pressed={post.likedByCurrentUser}
                    >
                      <span aria-hidden="true">{post.likedByCurrentUser ? '♥' : '♡'}</span>
                      {post.likedByCurrentUser ? 'Đã thích' : 'Thích'}
                    </button>
                    <button type="button" onClick={() => toggleComments(post.id)}>
                      <span aria-hidden="true">◌</span>
                      Bình luận
                    </button>
                    <button type="button" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
                      <span aria-hidden="true">↗</span>
                      Chia sẻ
                    </button>
                  </div>

                  {showComments && (
                    <div className={styles.comments}>
                      {comments.length > 0 ? (
                        comments.map((comment) => renderComment(post.id, comment))
                      ) : (
                        <div className={styles.emptyComments}>Chưa có bình luận nào.</div>
                      )}

                      <form className={styles.commentForm} onSubmit={(event) => handleComment(event, post.id)}>
                        <AutoTextarea
                          value={commentDrafts[post.id] || ''}
                          onChange={(event) =>
                            setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))
                          }
                          placeholder="Viết bình luận..."
                        />
                        <button type="submit">Gửi</button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default Forum;
