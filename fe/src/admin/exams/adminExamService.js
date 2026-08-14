import { API_BASE } from '../../config/apiBase';

const API = `${API_BASE}/admin/exams`;

function token() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
}

async function request(path, options = {}) {
  const headers = {
    ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    ...(options.headers || {}),
  };
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || "Không thể xử lý yêu cầu. Vui lòng thử lại.");
    error.data = body?.data;
    error.status = response.status;
    throw error;
  }
  return body?.data ?? body;
}

export const adminExamService = {
  async downloadImportTemplate(type) {
    const response = await fetch(`${API}/${type}/import-template`, {
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message || "Không thể tải file mẫu Excel.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `exam-import-${type}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
  importExam(type, file, assetFiles = []) {
    const body = new FormData();
    body.append("file", file);
    assetFiles.forEach((asset) => body.append("images", asset));
    return request(`/${type}/import`, { method: "POST", body });
  },
  create(type, data) { return request(`/${type}`, { method: "POST", body: JSON.stringify(data) }); },
  list(type, params) {
    return request(`/${type}?${new URLSearchParams(params)}`);
  },
  detail(type, id) { return request(`/${type}/${id}`); },
  update(type, id, data) { return request(`/${type}/${id}`, { method: "PUT", body: JSON.stringify(data) }); },
  status(type, id, status) { return request(`/${type}/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); },
  content(type, examId, resource, recordId, data) {
    return request(`/${type}/${examId}/${resource}/${recordId}`, { method: "PUT", body: JSON.stringify(data) });
  },
  addContent(type, examId, resource, data) {
    return request(`/${type}/${examId}/${resource}`, { method: "POST", body: JSON.stringify(data) });
  },
  deleteContent(type, examId, resource, recordId) {
    return request(`/${type}/${examId}/${resource}/${recordId}`, { method: "DELETE" });
  },
  uploadMedia(file, resourceType) {
    const body = new FormData();
    body.append("file", file);
    body.append("resourceType", resourceType);
    return request("/media", { method: "POST", body });
  },
  remove(type, id) { return request(`/${type}/${id}`, { method: "DELETE" }); },
};
