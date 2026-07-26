import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { adminExamService } from "./adminExamService";
import styles from "./AdminExamDetail.module.css";

function LinkValue({ value }) {
  if (!value) return <span className={styles.muted}>Không có</span>;
  return <span className={styles.linkValue}><span title={value}>{value}</span><a href={value} target="_blank" rel="noreferrer">Mở</a><button type="button" onClick={() => navigator.clipboard.writeText(value)}>Sao chép</button></span>;
}

function Editor({ label, value, field, readOnly, onSave, multiline = true, required = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(value ?? ""), [value]);
  const changed = String(draft) !== String(value ?? "");
  const save = async () => {
    if (required && !String(draft).trim()) return;
    setSaving(true);
    try { await onSave({ [field]: draft }); setEditing(false); } finally { setSaving(false); }
  };
  return <div className={styles.field}><div className={styles.fieldHead}><strong>{label}</strong>{!readOnly && !editing && <button onClick={() => setEditing(true)}>Sửa</button>}</div>
    {editing ? <><div className={styles.editor}>{multiline ? <textarea value={draft} onChange={(e) => setDraft(e.target.value)}/> : <input value={draft} onChange={(e) => setDraft(e.target.value)}/>}</div><div className={styles.editActions}><button onClick={() => { setDraft(value ?? ""); setEditing(false); }}>Hủy</button><button className={styles.save} disabled={!changed || saving || (required && !String(draft).trim())} onClick={save}>{saving ? "Đang lưu…" : "Lưu"}</button></div></> : <div className={styles.value}>{value || <span className={styles.muted}>Chưa có nội dung</span>}</div>}
  </div>;
}

function Options({ options, readOnly, save, resource = "options", answer = false }) {
  return <div className={styles.options}>{options?.map((o) => <div key={o.id}>{answer && resource === "answers" && <Editor label="Khóa đáp án" value={o.label} field="answerKey" readOnly={readOnly} required multiline={false} onSave={(body) => save(resource, o.id, body)}/>}<Editor label={`${answer ? "Đáp án" : "Lựa chọn"} ${o.label || ""}`} value={o.text} field={answer ? "answerText" : "text"} readOnly={readOnly} required onSave={(body) => save(resource, o.id, body)}/></div>)}</div>;
}

function Question({ q, readOnly, save, type }) {
  return <details className={styles.question}><summary>Câu {q.number} <span>{q.text || "(không có nội dung chữ)"}</span></summary><div className={styles.body}><Editor label="Nội dung câu hỏi" value={q.text} field={type === "toeic" ? "questionText" : "promptText"} readOnly={readOnly} onSave={(b) => save("questions",q.id,b)}/>{type === "toeic" && <Editor label="Đáp án đúng" value={q.correctAnswer} field="correctAnswer" readOnly={readOnly} required multiline={false} onSave={(b) => save("questions",q.id,b)}/>}<Editor label="Giải thích" value={q.explanation} field="explanation" readOnly={readOnly} onSave={(b) => save("questions",q.id,b)}/>{type === "toeic" && <><Editor label="Transcript" value={q.transcript} field="transcript" readOnly={readOnly} onSave={(b) => save("questions",q.id,b)}/><Editor label="Image URL" value={q.imageUrl} field="imageUrl" readOnly={readOnly} onSave={(b) => save("questions",q.id,b)}/><LinkValue value={q.imageUrl}/></>}<Options options={q.options} readOnly={readOnly} save={save}/><Options options={q.answers} readOnly={readOnly} save={save} resource="answers" answer/></div></details>;
}

export default function AdminExamDetail() {
  const { type, id } = useParams();
  const [search] = useSearchParams();
  const readOnly = search.get("preview") === "1";
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  useEffect(() => { setLoading(true); adminExamService.detail(type, id).then((d) => { setDetail(d); setForm({ examCode: d.exam.examCode, examName: d.exam.examName, status: d.exam.status, listeningAudioUrl: d.listeningAudioUrl || "" }); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [type, id]);
  const original = useMemo(() => detail ? { examCode: detail.exam.examCode, examName: detail.exam.examName, status: detail.exam.status, listeningAudioUrl: detail.listeningAudioUrl || "" } : null, [detail]);
  const changed = form && original && JSON.stringify(form) !== JSON.stringify(original);
  const saveMetadata = async (e) => { e.preventDefault(); setSaving(true); setError(""); try { const d = await adminExamService.update(type, id, form); setDetail(d); setForm({ examCode:d.exam.examCode, examName:d.exam.examName, status:d.exam.status, listeningAudioUrl:d.listeningAudioUrl || "" }); } catch (x) { setError(x.message); } finally { setSaving(false); } };
  const save = async (resource, recordId, body) => { setError(""); try { setDetail(await adminExamService.content(type, id, resource, recordId, body)); } catch (e) { setError(e.message); throw e; } };
  if (loading) return <div className={styles.state}>Đang tải cấu trúc đề thi…</div>;
  if (!detail) return <div className={styles.state}><p>{error || "Không tìm thấy đề thi."}</p><Link to="/admin/toeic-exams">Quay lại</Link></div>;
  return <main className={styles.page}>
    <div className={styles.header}><div><Link to="/admin/toeic-exams">← Danh sách đề thi</Link><h1>{readOnly ? "Xem trước" : "Chi tiết và chỉnh sửa"} {type.toUpperCase()}</h1><p>{detail.exam.examName} · {detail.exam.examCode}</p></div>{readOnly && <span className={styles.preview}>Chế độ chỉ đọc · không tạo lượt làm</span>}</div>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.card}><h2>Thông tin chung</h2><form className={styles.metaForm} onSubmit={saveMetadata}>
      <label>Mã đề<input required disabled={readOnly} value={form.examCode} onChange={(e) => setForm({...form, examCode:e.target.value})}/></label><label>Tên đề<input required disabled={readOnly} value={form.examName} onChange={(e) => setForm({...form, examName:e.target.value})}/></label><label>Trạng thái<select disabled={readOnly} value={form.status} onChange={(e) => setForm({...form, status:e.target.value})}><option value="published">published</option><option value="hidden">hidden</option><option value="draft">draft</option><option value="active">active</option><option value="ready">ready</option></select></label>
      {type === "toeic" && <label className={styles.wide}>Audio Listening<input required disabled={readOnly} value={form.listeningAudioUrl} onChange={(e) => setForm({...form, listeningAudioUrl:e.target.value})}/><LinkValue value={form.listeningAudioUrl}/></label>}{!readOnly && <div className={styles.formActions}><button type="button" disabled={!changed || saving} onClick={() => setForm(original)}>Hủy</button><button className={styles.primary} disabled={!changed || saving}>{saving ? "Đang lưu…" : "Lưu metadata"}</button></div>}
    </form></section>
    <section className={styles.card}><h2>Cấu trúc đề ({detail.exam.questionCount} câu)</h2>{detail.groups.map((group) => <details className={styles.accordion} key={group.id}><summary><span>{group.skill || group.type} · Part/Section {group.partNo ?? "—"} · Group {group.groupNo ?? "—"}</span><b>{group.blocks?.reduce((n,b) => n + b.questions.length, 0) || group.questions?.length || 0} câu</b></summary><div className={styles.body}>
      <Editor label="Tiêu đề" value={group.title} field="title" readOnly={readOnly} onSave={(b) => save("groups",group.id,b)}/><Editor label="Hướng dẫn" value={group.instruction} field="instruction" readOnly={readOnly} onSave={(b) => save("groups",group.id,b)}/><Editor label="Nội dung chung / Script" value={group.sharedText} field="sharedText" readOnly={readOnly} onSave={(b) => save("groups",group.id,b)}/>{group.media?.map((m) => <div className={styles.subcard} key={m.id}><b>{m.type}</b><LinkValue value={m.assetUrl}/><Editor label="Nội dung media" value={m.content} field="content" readOnly={readOnly} onSave={(b) => save("materials",m.id,b)}/><Editor label="URL" value={m.assetUrl} field="assetUrl" readOnly={readOnly} onSave={(b) => save("materials",m.id,b)}/></div>)}{group.questions?.map((q) => <Question key={q.id} q={q} readOnly={readOnly} save={save} type={type}/>)}{group.blocks?.map((block) => <details className={styles.nested} key={block.id}><summary>Block {block.number} · {block.type} · {block.questions.length} câu</summary><div className={styles.body}><Editor label="Hướng dẫn block" value={block.instruction} field="instruction" readOnly={readOnly} onSave={(b) => save("blocks",block.id,b)}/>{block.questions.map((q) => <Question key={q.id} q={q} readOnly={readOnly} save={save} type={type}/>)}</div></details>)}</div></details>)}</section>
    {detail.writingTasks?.length > 0 && <section className={styles.card}><h2>Writing Task 1–2</h2>{detail.writingTasks.map((t) => <details className={styles.accordion} key={t.id}><summary>Task {t.taskNo} · {t.taskType}</summary><div className={styles.body}><Editor label="Hướng dẫn" value={t.instruction} field="instruction" readOnly={readOnly} required onSave={(b) => save("writing-tasks",t.id,b)}/><Editor label="Đề bài" value={t.prompt} field="promptText" readOnly={readOnly} required onSave={(b) => save("writing-tasks",t.id,b)}/><Options options={t.samples} readOnly={readOnly} save={save} resource="writing-samples" answer/></div></details>)}</section>}
    {detail.speakingTasks?.length > 0 && <section className={styles.card}><h2>Speaking Part 1–3</h2>{detail.speakingTasks.map((t) => <details className={styles.accordion} key={t.id}><summary>Part {t.partNo} · {t.title}</summary><div className={styles.body}><Editor label="Chủ đề" value={t.title} field="topicTitle" readOnly={readOnly} onSave={(b) => save("speaking-tasks",t.id,b)}/><Editor label="Hướng dẫn" value={t.instruction} field="instruction" readOnly={readOnly} onSave={(b) => save("speaking-tasks",t.id,b)}/><Options options={t.items} readOnly={readOnly} save={save} resource="speaking-items"/><Options options={t.samples} readOnly={readOnly} save={save} resource="speaking-samples" answer/></div></details>)}</section>}
    {detail.media?.length > 0 && <section className={styles.card}><h2>Audio / Image / Media IELTS</h2>{detail.media.map((m) => <div className={styles.mediaRow} key={m.id}><b>{m.content} · {m.type}</b><LinkValue value={m.assetUrl}/><Editor label="URL media" value={m.assetUrl} field="assetUrl" readOnly={readOnly} onSave={(b) => save("media",m.id,b)}/></div>)}</section>}
  </main>;
}
