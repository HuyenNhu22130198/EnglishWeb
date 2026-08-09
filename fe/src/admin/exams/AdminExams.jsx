import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminPageHeader from "../components/AdminPageHeader";
import Pagination from "../components/Pagination";
import { FileTextIcon, RefreshIcon, SearchIcon } from "../components/AdminIcons";
import { useConfirmDialog } from "../../contexts/useConfirmDialog";
import { adminExamService } from "./adminExamService";
import shared from "../AdminShared.module.css";
import styles from "./AdminExams.module.css";

const PAGE_SIZE = 10;

export default function AdminExams() {
  const [type, setType] = useState("toeic");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();
  const confirm = useConfirmDialog();

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const result = await adminExamService.list(type, { keyword, status, sort, page, size: PAGE_SIZE });
        if (!controller.signal.aborted) setData(result);
      } catch (e) { if (!controller.signal.aborted) setError(e.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [type, keyword, status, sort, page, refresh]);

  const switchType = (next) => { setType(next); setPage(0); };
  const preview = (exam) => {
    if (exam.status?.toLowerCase() === "hidden") navigate(`/admin/exams/${type}/${exam.id}?preview=1`);
    else window.open(`/exams/${type}/${exam.id}`, "_blank", "noopener,noreferrer");
  };
  const toggle = async (exam) => {
    try {
      await adminExamService.status(type, exam.id, exam.status?.toLowerCase() === "hidden" ? "published" : "hidden");
      setRefresh((x) => x + 1);
    } catch (e) { setError(e.message); }
  };
  const remove = async (exam) => {
    if (exam.attemptCount > 0) { setError("Đề đã có lượt làm nên không thể xóa. Hãy chuyển đề sang trạng thái Ẩn."); return; }
    const ok = await confirm({ title: "Xóa đề thi?", message: `Bạn sắp xóa vĩnh viễn “${exam.examName}” (${exam.examCode}). Thao tác này không thể hoàn tác.`, confirmLabel: "Xóa đề", tone: "danger" });
    if (!ok) return;
    try { await adminExamService.remove(type, exam.id); setRefresh((x) => x + 1); }
    catch (e) { setError(e.message); }
  };

  return <div className={shared.page}>
    <AdminPageHeader title="Quản lý đề thi" subtitle="Quản lý đề TOEIC và IELTS hiện có, trạng thái hiển thị và nội dung câu hỏi.">
      <button className={shared.secondaryButton} type="button" onClick={() => setRefresh((x) => x + 1)} disabled={loading}><RefreshIcon size={18}/> Làm mới</button>
      <button className={shared.primaryButton} type="button" onClick={() => navigate(`/admin/exams/${type}/new`)}><FileTextIcon size={18}/> Tạo đề mới</button>
    </AdminPageHeader>
    <div className={styles.tabs} role="tablist">
      {['toeic','ielts'].map((item) => <button key={item} className={type === item ? styles.activeTab : ""} onClick={() => switchType(item)}>{item.toUpperCase()}</button>)}
    </div>
    <section className={shared.panel}>
      <div className={shared.toolbar}>
        <div className={shared.searchWrap}><span className={shared.searchIcon}><SearchIcon size={19}/></span><input className={shared.searchInput} value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0); }} placeholder="Tìm theo tên hoặc mã đề..."/></div>
        <select className={shared.select} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}><option value="ALL">Tất cả trạng thái</option><option value="published">Hiển thị</option><option value="hidden">Đã ẩn</option><option value="draft">Bản nháp</option><option value="active">Active</option><option value="ready">Ready</option></select>
        <select className={shared.select} value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></select>
      </div>
      {error && <div className={shared.errorBox}>{error}</div>}
      {loading ? <div className={shared.emptyState}>Đang tải danh sách đề thi…</div> : data.content.length === 0 ? <div className={shared.emptyState}>Không tìm thấy đề thi phù hợp.</div> : <>
        <div className={shared.resultSummary}>Tìm thấy <strong>{data.totalElements}</strong> đề {type.toUpperCase()}</div>
        <div className={shared.tableWrap}><table className={shared.table}><thead><tr><th>ID / Mã đề</th><th>Tên đề</th><th>Loại</th><th>Trạng thái</th><th>Câu hỏi</th><th>Lượt làm</th><th>Ngày tạo / cập nhật</th><th>Thao tác</th></tr></thead><tbody>
          {data.content.map((exam) => <tr key={exam.id}><td><strong>#{exam.id}</strong><br/><code>{exam.examCode}</code></td><td className={styles.name}>{exam.examName}</td><td>{exam.examType}</td><td><span className={`${styles.badge} ${exam.status?.toLowerCase() === 'hidden' ? styles.hidden : ''}`}>{exam.status}</span></td><td>{exam.questionCount}</td><td>{exam.attemptCount}</td><td>{exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('vi-VN') : '—'}<br/><small>{exam.updatedAt ? new Date(exam.updatedAt).toLocaleDateString('vi-VN') : '—'}</small></td><td><div className={styles.actions}><button onClick={() => navigate(`/admin/exams/${type}/${exam.id}`)}>Chi tiết / Sửa</button><button onClick={() => preview(exam)}>Xem trước</button><button onClick={() => toggle(exam)}>{exam.status?.toLowerCase() === 'hidden' ? 'Hiện' : 'Ẩn'}</button><button className={styles.delete} onClick={() => remove(exam)}>Xóa</button></div></td></tr>)}
        </tbody></table></div>
        <div className={shared.panelFooter}><span className={shared.footerInfo}>Trang <strong>{page + 1}</strong> / {Math.max(1, data.totalPages)}</span><Pagination currentPage={page + 1} totalPages={data.totalPages} onPageChange={(p) => setPage(p - 1)}/></div>
      </>}
    </section>
  </div>;
}
