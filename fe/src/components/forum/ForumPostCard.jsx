import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/forumCommentTree';
import { FORUM_CATEGORY_LABELS } from '../../services/forumService';
import styles from '../../pages/Forum.module.css';

const CATEGORY_CHOICES = Object.entries(FORUM_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

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

const ReportForm = ({ onCancel, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.editForm} onSubmit={handleSubmit}>
      <AutoTextarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Mô tả lý do bạn báo cáo nội dung này..."
        maxLength={300}
      />
      <div className={styles.inlineActions}>
        <button type="button" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" disabled={submitting || !reason.trim()}>
          Gửi báo cáo
        </button>
      </div>
    </form>
  );
};

const useClickOutside = (onOutside) => {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);

  return ref;
};

const PostEditForm = ({ post, onCancel, onSave }) => {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [category, setCategory] = useState(post.category || 'KHAC');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), content: content.trim(), category });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.composer} onSubmit={handleSubmit} style={{ margin: '12px 20px' }}>
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tiêu đề câu hỏi" maxLength={160} />
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Nội dung bạn muốn chia sẻ hoặc thảo luận"
        rows={5}
        maxLength={5000}
      />
      <div className={styles.postFormRow}>
        <select className={styles.toolbarSelect} value={category} onChange={(event) => setCategory(event.target.value)}>
          {CATEGORY_CHOICES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.composerActions}>
        <button type="button" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" disabled={saving || !title.trim() || !content.trim()}>
          Lưu thay đổi
        </button>
      </div>
    </form>
  );
};

const ForumPostCard = ({
  post,
  currentUser,
  isDetail = false,
  forceExpanded = false,
  requireLogin,
  onLike,
  onSave,
  onEditSubmit,
  onDeletePost,
  onReportPost,
  onExpandComments,
  onAddComment,
  onCommentLike,
  onUpdateComment,
  onDeleteComment,
  onReportComment,
}) => {
  const [expanded, setExpanded] = useState(forceExpanded);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [editDrafts, setEditDrafts] = useState({});
  const [activeReply, setActiveReply] = useState(null);
  const [activeEdit, setActiveEdit] = useState(null);
  const [reportingPost, setReportingPost] = useState(false);
  const [reportingComment, setReportingComment] = useState(null);
  const [commentMenuOpen, setCommentMenuOpen] = useState(null);
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(false);

  const postMenuRef = useClickOutside(() => setPostMenuOpen(false));

  const comments = post.comments || [];
  const isOwnPost = String(post.author?.id) === String(currentUser?.id);

  const toggleComments = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !post.commentsLoaded) {
      await onExpandComments(post.id);
    }
  };

  const handleAddComment = async (event, parentCommentId = null) => {
    event.preventDefault();
    if (!requireLogin()) return;

    const draftKey = parentCommentId || 'root';
    const source = parentCommentId ? replyDrafts : commentDrafts;
    const content = (source[draftKey] || '').trim();
    if (!content) return;

    await onAddComment(post.id, parentCommentId, content);

    if (parentCommentId) {
      setReplyDrafts((current) => ({ ...current, [parentCommentId]: '' }));
      setActiveReply(null);
    } else {
      setCommentDrafts((current) => ({ ...current, root: '' }));
    }

    if (!expanded) setExpanded(true);
  };

  const startEditComment = (comment) => {
    setActiveEdit(comment.id);
    setEditDrafts((current) => ({ ...current, [comment.id]: comment.content }));
    setCommentMenuOpen(null);
  };

  const handleUpdateComment = async (event, commentId) => {
    event.preventDefault();
    const content = (editDrafts[commentId] || '').trim();
    if (!content) return;
    await onUpdateComment(post.id, commentId, content);
    setActiveEdit(null);
  };

  const renderComment = (comment, depth = 0) => {
    const replies = comment.replies || [];
    const isReplying = activeReply === comment.id;
    const isEditing = activeEdit === comment.id;
    const isOwnComment = String(comment.author?.id) === String(currentUser?.id);

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
                  onClick={() => (requireLogin() ? onCommentLike(post.id, comment.id) : null)}
                >
                  {comment.likedByCurrentUser ? 'Đã thích' : 'Thích'}
                </button>
                {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
                <button
                  type="button"
                  onClick={() => {
                    if (requireLogin()) {
                      setActiveReply(isReplying ? null : comment.id);
                    }
                  }}
                >
                  Trả lời
                </button>
                {isOwnComment ? (
                  <>
                    <button type="button" onClick={() => startEditComment(comment)}>
                      Sửa
                    </button>
                    <button type="button" onClick={() => onDeleteComment(post.id, comment.id)}>
                      Xóa
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (requireLogin()) {
                        setCommentMenuOpen(commentMenuOpen === comment.id ? null : comment.id);
                      }
                    }}
                  >
                    Báo cáo
                  </button>
                )}
              </div>
            )}

            {reportingComment === comment.id && (
              <ReportForm
                onCancel={() => {
                  setReportingComment(null);
                  setCommentMenuOpen(null);
                }}
                onSubmit={async (reason) => {
                  await onReportComment(comment.id, reason);
                  setReportingComment(null);
                  setCommentMenuOpen(null);
                }}
              />
            )}

            {commentMenuOpen === comment.id && reportingComment !== comment.id && (
              <div className={styles.inlineActions}>
                <button type="button" onClick={() => setReportingComment(comment.id)}>
                  Xác nhận báo cáo bình luận này
                </button>
                <button type="button" onClick={() => setCommentMenuOpen(null)}>
                  Hủy
                </button>
              </div>
            )}

            {isReplying && (
              <form className={styles.replyForm} onSubmit={(event) => handleAddComment(event, comment.id)}>
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
          <div className={styles.replies}>{replies.map((reply) => renderComment(reply, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (editingPost) {
    return (
      <article className={styles.postCard}>
        <PostEditForm
          post={post}
          onCancel={() => setEditingPost(false)}
          onSave={async (payload) => {
            await onEditSubmit(post.id, payload);
            setEditingPost(false);
          }}
        />
      </article>
    );
  }

  return (
    <article className={styles.postCard}>
      <div className={styles.postHeader}>
        <span className={styles.avatar}>{post.author?.initial || 'U'}</span>
        <div className={styles.postHeaderInfo}>
          <strong>{post.author?.fullName || post.author?.username}</strong>
          <span>
            {formatDate(post.createdAt)}
            {post.category && FORUM_CATEGORY_LABELS[post.category] && (
              <span className={styles.categoryBadge}>{FORUM_CATEGORY_LABELS[post.category]}</span>
            )}
          </span>
        </div>
        <div className={styles.postMenuWrap} ref={postMenuRef}>
          <button type="button" className={styles.postMenuBtn} onClick={() => setPostMenuOpen(!postMenuOpen)} aria-label="Tùy chọn bài viết">
            ⋯
          </button>
          {postMenuOpen && (
            <div className={styles.postMenuDropdown}>
              {isOwnPost ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPostMenuOpen(false);
                      setEditingPost(true);
                    }}
                  >
                    Sửa bài viết
                  </button>
                  <button
                    type="button"
                    className={styles.dangerItem}
                    onClick={() => {
                      setPostMenuOpen(false);
                      onDeletePost(post.id);
                    }}
                  >
                    Xóa bài viết
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (requireLogin()) {
                      setReportingPost(true);
                      setPostMenuOpen(false);
                    }
                  }}
                >
                  Báo cáo bài viết
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {reportingPost && (
        <div style={{ margin: '10px 20px 0' }}>
          <ReportForm
            onCancel={() => setReportingPost(false)}
            onSubmit={async (reason) => {
              await onReportPost(post.id, reason);
              setReportingPost(false);
            }}
          />
        </div>
      )}

      <h2>{post.title}</h2>
      <p>{post.content}</p>

      <div className={styles.postMeta}>
        <span>{post.likeCount} lượt thích</span>
        <button type="button" onClick={toggleComments}>
          {post.commentCount} bình luận
        </button>
      </div>

      <div className={styles.postActions}>
        <button
          type="button"
          className={post.likedByCurrentUser ? styles.liked : ''}
          onClick={() => (requireLogin() ? onLike(post.id) : null)}
          aria-pressed={post.likedByCurrentUser}
        >
          <span aria-hidden="true">{post.likedByCurrentUser ? '♥' : '♡'}</span>
          Thích
        </button>
        <button type="button" onClick={toggleComments}>
          <span aria-hidden="true">◌</span>
          Bình luận
        </button>
        <button
          type="button"
          className={post.savedByCurrentUser ? styles.liked : ''}
          onClick={() => (requireLogin() ? onSave(post.id) : null)}
          aria-pressed={post.savedByCurrentUser}
        >
          <span aria-hidden="true">{post.savedByCurrentUser ? '★' : '☆'}</span>
          Lưu
        </button>
      </div>

      {expanded && (
        <div className={styles.comments}>
          {comments.length > 0 ? (
            comments.map((comment) => renderComment(comment))
          ) : post.commentsLoaded ? (
            <div className={styles.emptyComments}>Chưa có bình luận nào.</div>
          ) : (
            <div className={styles.emptyComments}>Đang tải bình luận...</div>
          )}

          <form className={styles.commentForm} onSubmit={(event) => handleAddComment(event, null)}>
            <AutoTextarea
              value={commentDrafts.root || ''}
              onChange={(event) => setCommentDrafts((current) => ({ ...current, root: event.target.value }))}
              placeholder="Viết bình luận..."
            />
            <button type="submit">Gửi</button>
          </form>
        </div>
      )}

      {!isDetail && (
        <Link to={`/forum/posts/${post.id}`} className={styles.detailLink}>
          Xem chi tiết bài viết →
        </Link>
      )}
    </article>
  );
};

export default ForumPostCard;
