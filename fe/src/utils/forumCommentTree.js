export const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays <= 0) return 'Hôm nay';
  if (diffDays < 30) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
};

export const appendComment = (comments, parentCommentId, newComment) => {
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

export const updateCommentTree = (comments, commentId, updater) =>
  comments.map((comment) => {
    if (comment.id === commentId) {
      return updater(comment);
    }

    return {
      ...comment,
      replies: updateCommentTree(comment.replies || [], commentId, updater),
    };
  });

export const countCommentTree = (comment) =>
  1 + (comment.replies || []).reduce((total, reply) => total + countCommentTree(reply), 0);

export const removeCommentTree = (comments, commentId) =>
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
