import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import AdminPageHeader from "../components/AdminPageHeader";
import AdminModal from "../components/AdminModal";
import { adminExamService } from "./adminExamService";
import shared from "../AdminShared.module.css";
import styles from "./AdminExamCreate.module.css";

const STATUSES = ["draft", "published", "active", "ready", "hidden"];

export default function AdminExamCreate() {
  const { type: rawType } = useParams();
  const type = rawType?.toLowerCase();
  const navigate = useNavigate();
  const [form, setForm] = useState({ examCode: "", examName: "", status: "draft", listeningAudioUrl: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [assetFiles, setAssetFiles] = useState([]);
  if (!['toeic', 'ielts'].includes(type)) return <Navigate to="/admin/toeic-exams" replace />;

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const uploadAudio = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try { set("listeningAudioUrl", (await adminExamService.uploadMedia(file, "audio")).url); }
    catch (e) { setError(e.message); }
    finally { setUploading(false); event.target.value = ""; }
  };
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const detail = await adminExamService.create(type, form);
      navigate(`/admin/exams/${type}/${detail.exam.id}`);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };
  const downloadTemplate = async () => {
    setDownloading(true); setError("");
    try { await adminExamService.downloadImportTemplate(type); }
    catch (e) { setError(e.message); }
    finally { setDownloading(false); }
  };
  const openImport = () => {
    setExcelFile(null); setAssetFiles([]); setImportErrors([]); setError(""); setImportModalOpen(true);
  };
  const closeImport = () => { if (!importing) setImportModalOpen(false); };
  const importExcel = async () => {
    if (!excelFile) { setError("Vui lòng chọn file Excel .xlsx."); return; }
    setImporting(true); setError(""); setImportErrors([]);
    try {
      const detail = await adminExamService.importExam(type, excelFile, assetFiles);
      navigate(`/admin/exams/${type}/${detail.exam.id}`);
    } catch (e) {
      if (Array.isArray(e.data) && e.data.length) { setImportModalOpen(false); setImportErrors(e.data); }
      else setError(e.message);
    } finally { setImporting(false); }
  };

  return <div className={shared.page}>
    <AdminPageHeader title={`Tạo đề ${type.toUpperCase()}`} subtitle="Tạo thủ công hoặc import toàn bộ metadata và nội dung từ file Excel.">
      <button type="button" className={shared.secondaryButton} onClick={downloadTemplate} disabled={downloading || importing}>{downloading ? "Đang tải…" : "Tải file mẫu Excel"}</button>
      <button type="button" className={shared.primaryButton} onClick={openImport} disabled={importing || downloading}>{importing ? "Đang import…" : "Import từ Excel"}</button>
    </AdminPageHeader>
    {error && <div className={shared.errorBox}>{error}</div>}
    <section className={`${shared.panel} ${styles.panel}`}>
      <form className={styles.form} onSubmit={submit}>
        <label>Mã đề<input required maxLength={type === "toeic" ? 30 : 50} value={form.examCode} onChange={(e) => set("examCode", e.target.value)} /></label>
        <label>Tên đề<input required value={form.examName} onChange={(e) => set("examName", e.target.value)} /></label>
        <label>Trạng thái<select value={form.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        {type === "toeic" && <label className={styles.wide}>Audio Listening URL<input required value={form.listeningAudioUrl} onChange={(e) => set("listeningAudioUrl", e.target.value)} placeholder="https://..."/><span className={styles.upload}><input type="file" accept="audio/*" onChange={uploadAudio} disabled={uploading}/>{uploading ? "Đang tải audio…" : "Hoặc tải file audio lên Cloudinary"}</span></label>}
        <div className={styles.actions}><Link className={shared.secondaryButton} to="/admin/toeic-exams">Hủy</Link><button className={shared.primaryButton} disabled={saving || uploading}>{saving ? "Đang tạo…" : "Tạo và thêm nội dung"}</button></div>
      </form>
    </section>
    <AdminModal open={importModalOpen} title={`Import đề ${type.toUpperCase()} từ Excel`} description="Giá trị media trong Excel có thể là URL hoặc đúng tên file đính kèm bên dưới." size="md" onClose={closeImport} footer={<><button type="button" className={shared.secondaryButton} onClick={closeImport} disabled={importing}>Hủy</button><button type="button" className={shared.primaryButton} onClick={importExcel} disabled={importing || !excelFile}>{importing ? "Đang upload và import…" : "Import"}</button></>}>
      <div className={styles.importForm}>
        {error && <div className={styles.inlineError}>{error}</div>}
        <label>File Excel <span className={styles.required}>*</span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setExcelFile(event.target.files?.[0] || null)}/></label>
        {excelFile && <div className={styles.selectedExcel}><strong>Đã chọn:</strong> {excelFile.name}</div>}
        <label>Ảnh/audio đính kèm (tùy chọn)<input type="file" multiple accept="image/*,audio/*" onChange={(event) => { setAssetFiles(Array.from(event.target.files || [])); event.target.value = ""; }}/></label>
        <p className={styles.importHint}>Tên file phải khớp với Excel, không phân biệt chữ hoa/thường. Một file dùng ở nhiều dòng chỉ được upload một lần.</p>
        {assetFiles.length > 0 && <ul className={styles.assetList}>{assetFiles.map((file,index) => <li key={`${file.name}-${index}`}><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "Không rõ định dạng"}</small></span><button type="button" onClick={() => setAssetFiles((current) => current.filter((_,itemIndex) => itemIndex !== index))} disabled={importing}>Xóa</button></li>)}</ul>}
      </div>
    </AdminModal>
    <AdminModal open={importErrors.length > 0} title="File Excel có dữ liệu không hợp lệ" description="Hãy sửa tất cả lỗi dưới đây rồi import lại. Không có dữ liệu nào được tạo từ lần import này." size="lg" onClose={() => { setImportErrors([]); setImportModalOpen(true); }} footer={<button type="button" className={shared.primaryButton} onClick={() => { setImportErrors([]); setImportModalOpen(true); }}>Quay lại chọn file</button>}>
      <div className={styles.errorTableWrap}><table className={styles.errorTable}><thead><tr><th>Sheet</th><th>Dòng</th><th>Lỗi</th></tr></thead><tbody>{importErrors.map((item,index) => <tr key={`${item.sheet}-${item.row}-${index}`}><td>{item.sheet}</td><td>{item.row || "—"}</td><td>{item.message}</td></tr>)}</tbody></table></div>
    </AdminModal>
  </div>;
}
