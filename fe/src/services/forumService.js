import api from './authService';

export const forumAPI = {
  getPosts: async () => {
    const response = await api.get('/forum/posts');
    return response.data;
  },

  createPost: async (data) => {
    const response = await api.post('/forum/posts', data);
    return response.data;
  },

  toggleLike: async (postId) => {
    const response = await api.post(`/forum/posts/${postId}/like`);
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
