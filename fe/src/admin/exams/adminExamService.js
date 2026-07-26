const API = "http://localhost:8080/api/admin/exams";

function token() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || "Không thể xử lý yêu cầu. Vui lòng thử lại.");
  return body?.data ?? body;
}

export const adminExamService = {
  list(type, params) {
    return request(`/${type}?${new URLSearchParams(params)}`);
  },
  detail(type, id) { return request(`/${type}/${id}`); },
  update(type, id, data) { return request(`/${type}/${id}`, { method: "PUT", body: JSON.stringify(data) }); },
  status(type, id, status) { return request(`/${type}/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); },
  content(type, examId, resource, recordId, data) {
    return request(`/${type}/${examId}/${resource}/${recordId}`, { method: "PUT", body: JSON.stringify(data) });
  },
  remove(type, id) { return request(`/${type}/${id}`, { method: "DELETE" }); },
};
