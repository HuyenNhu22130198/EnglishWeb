import api from './authService';

export const forumAPI = {
  getCategories: async () => {
    const response = await api.get('/forum/categories');
    return response.data;
  },

  getPosts: async ({ page = 0, size = 10, category, keyword, sort } = {}) => {
    const response = await api.get('/forum/posts', {
      params: { page, size, category: category || undefined, keyword: keyword || undefined, sort },
    });
    return response.data;
  },

  getPostDetail: async (postId) => {
    const response = await api.get(`/forum/posts/${postId}`);
    return response.data;
  },

  createPost: async (data) => {
    const response = await api.post('/forum/posts', data);
    return response.data;
  },

  updatePost: async (postId, data) => {
    const response = await api.put(`/forum/posts/${postId}`, data);
    return response.data;
  },

  deletePost: async (postId) => {
    const response = await api.delete(`/forum/posts/${postId}`);
    return response.data;
  },

  toggleLike: async (postId) => {
    const response = await api.post(`/forum/posts/${postId}/like`);
    return response.data;
  },

  toggleSave: async (postId) => {
    const response = await api.post(`/forum/posts/${postId}/save`);
    return response.data;
  },

  getSavedPosts: async ({ page = 0, size = 10 } = {}) => {
    const response = await api.get('/forum/saved-posts', { params: { page, size } });
    return response.data;
  },

  reportPost: async (postId, reason) => {
    const response = await api.post(`/forum/posts/${postId}/report`, { reason });
    return response.data;
  },

  reportComment: async (commentId, reason) => {
    const response = await api.post(`/forum/comments/${commentId}/report`, { reason });
    return response.data;
  },

  addComment: async (postId, content, parentCommentId = null) => {
    const response = await api.post(`/forum/posts/${postId}/comments`, { content, parentCommentId });
    return response.data;
  },

  updateComment: async (commentId, content) => {
    const response = await api.put(`/forum/comments/${commentId}`, { content });
    return response.data;
  },

  deleteComment: async (commentId) => {
    const response = await api.delete(`/forum/comments/${commentId}`);
    return response.data;
  },

  toggleCommentLike: async (commentId) => {
    const response = await api.post(`/forum/comments/${commentId}/like`);
    return response.data;
  },
};

export const FORUM_CATEGORY_LABELS = {
  NGU_PHAP: 'Ngữ pháp',
  TU_VUNG: 'Từ vựng',
  KY_NANG: 'Kỹ năng',
  IELTS: 'IELTS',
  TOEIC: 'TOEIC',
  KHAC: 'Khác',
};
