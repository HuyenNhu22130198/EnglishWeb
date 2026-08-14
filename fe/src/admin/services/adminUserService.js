import { API_BASE } from '../../config/apiBase';

const API_BASE_URL = `${API_BASE}/users`;

function getToken() {
  const directToken =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken");

  if (directToken) return directToken;

  const rawUser =
    localStorage.getItem("user") ||
    localStorage.getItem("authUser") ||
    localStorage.getItem("currentUser");

  if (!rawUser) return null;

  try {
    const parsedUser = JSON.parse(rawUser);
    return parsedUser?.token || parsedUser?.accessToken || null;
  } catch {
    return null;
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Có lỗi xảy ra khi gọi API");
  }

  return data?.data ?? data;
}

export const adminUserService = {
  getAllUsers() {
    return request("/admin/all");
  },

  updateUserRole(userId, role) {
    return request("/admin/update-role", {
      method: "PUT",
      body: JSON.stringify({
        userId,
        role,
      }),
    });
  },

  disableUser(userId) {
    return request(`/admin/disable/${userId}`, {
      method: "PUT",
    });
  },

  enableUser(userId) {
    return request(`/admin/enable/${userId}`, {
      method: "PUT",
    });
  },
};
