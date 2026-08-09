import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import AdminModal from "../components/AdminModal";
import { useConfirmDialog } from "../../contexts/useConfirmDialog";
import { adminExamService } from "./adminExamService";
import styles from "./AdminExamDetail.module.css";

function UploadField({ resourceType, onUploaded, disabled }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try { await onUploaded((await adminExamService.uploadMedia(file, resourceType)).url); }
    catch (e) { setError(e.message); }
    finally { setUploading(false); event.target.value = ""; }
  };
  return <span className={styles.uploadField}><input type="file" accept={`${resourceType}/*`} onChange={upload} disabled={disabled || uploading}/><small>{uploading ? "Đang tải lên…" : `Tải ${resourceType === "audio" ? "audio" : "ảnh"}`}</small>{error && <small className={styles.uploadError}>{error}</small>}</span>;
}

function NodeActions({ readOnly, onAdd, addLabel = "Thêm", onDelete }) {
  if (readOnly) return null;
  return <div className={styles.nodeActions}>{onAdd && <button type="button" onClick={onAdd}>+ {addLabel}</button>}{onDelete && <button type="button" className={styles.deleteButton} onClick={onDelete}>Xóa</button>}</div>;
}

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

function Options({ options, readOnly, save, resource = "options", answer = false, onAdd, onDelete }) {
  return <div className={styles.options}><NodeActions readOnly={readOnly} onAdd={onAdd} addLabel={answer ? "đáp án / bài mẫu" : "lựa chọn / câu hỏi"}/>{options?.map((o) => <div className={styles.optionRow} key={o.id}><NodeActions readOnly={readOnly} onDelete={() => onDelete(resource, o.id)}/>{answer && resource === "answers" && <Editor label="Khóa đáp án" value={o.label} field="answerKey" readOnly={readOnly} required multiline={false} onSave={(body) => save(resource, o.id, body)}/>}<Editor label={`${answer ? "Đáp án" : "Lựa chọn"} ${o.label || ""}`} value={o.text} field={answer ? "answerText" : "text"} readOnly={readOnly} required onSave={(body) => save(resource, o.id, body)}/></div>)}</div>;
}

function Question({ q, readOnly, save, type, add, remove }) {
  return <details className={styles.question}><summary>Câu {q.number} <span>{q.text || "(không có nội dung chữ)"}</span></summary><div className={styles.body}><NodeActions readOnly={readOnly} onDelete={() => remove("questions", q.id)}/><Editor label="Nội dung câu hỏi" value={q.text} field={type === "toeic" ? "questionText" : "promptText"} readOnly={readOnly} onSave={(b) => save("questions",q.id,b)}/>{type === "toeic" && <Editor label="Đáp án đúng" value={q.correctAnswer} field="correctAnswer" readOnly={readOnly} required multiline={false} onSave={(b) => save("questions",q.id,b)}/>}<Editor label="Giải thích" value={q.explanation} field="explanation" readOnly={readOnly} onSave={(b) => save("questions",q.id,b)}/>{type === "toeic" && <><Editor label="Transcript" value={q.transcript} field="transcript" readOnly={readOnly} onSave={(b) => save("questions",q.id,b)}/><Editor label="Image URL" value={q.imageUrl} field="imageUrl" readOnly={readOnly} onSave={(b) => save("questions",q.id,b)}/><LinkValue value={q.imageUrl}/>{!readOnly && <UploadField resourceType="image" onUploaded={(url) => save("questions", q.id, { imageUrl: url })}/>}</>}<Options options={q.options} readOnly={readOnly} save={save} onAdd={() => add("options", q.id)} onDelete={remove}/>{type === "ielts" && <Options options={q.answers} readOnly={readOnly} save={save} resource="answers" answer onAdd={() => add("answers", q.id)} onDelete={remove}/>}</div></details>;
}

const CREATE_FIELDS = {
  groups: [["skill", "Kỹ năng", "select"], ["partNo", "Part / Section", "number"], ["groupNo", "Group", "number"], ["type", "Loại group"], ["title", "Tiêu đề"], ["instruction", "Hướng dẫn", "textarea"], ["sharedText", "Nội dung chung", "textarea"]],
  blocks: [["blockNo", "Số block", "number"], ["type", "Loại câu hỏi", "required"], ["instruction", "Hướng dẫn", "textarea"], ["maxAnswers", "Số đáp án tối đa", "number"]],
  questions: [["questionNo", "Số câu", "number"], ["questionText", "Nội dung câu hỏi", "textarea"], ["promptText", "Prompt", "textarea"], ["correctAnswer", "Đáp án đúng TOEIC"], ["explanation", "Giải thích", "textarea"], ["transcript", "Transcript", "textarea"], ["imageUrl", "URL ảnh"]],
  options: [["optionKey", "Khóa lựa chọn IELTS"], ["optionLabel", "Nhãn lựa chọn TOEIC"], ["text", "Nội dung", "required"]],
  answers: [["answerKey", "Khóa đáp án"], ["answerText", "Đáp án", "required"]],
  materials: [["type", "Loại material", "required"], ["content", "Nội dung", "textarea"], ["assetUrl", "URL media"]],
  media: [["skill", "Kỹ năng"], ["partNo", "Part", "number"], ["type", "Loại media", "required"], ["assetUrl", "URL media", "required"]],
  "writing-tasks": [["taskNo", "Task", "number"], ["type", "Loại task", "required"], ["instruction", "Hướng dẫn", "textarea-required"], ["promptText", "Đề bài", "textarea-required"], ["minWords", "Số từ tối thiểu", "number"]],
  "writing-samples": [["answerText", "Bài mẫu", "textarea-required"]],
  "speaking-tasks": [["partNo", "Part", "number"], ["topicTitle", "Chủ đề"], ["instruction", "Hướng dẫn", "textarea"]],
  "speaking-items": [["text", "Câu hỏi", "textarea-required"]],
  "speaking-samples": [["title", "Tiêu đề đoạn"], ["answerText", "Bài mẫu", "textarea-required"]],
};

const RESOURCE_LABELS = { groups: "group", blocks: "block", questions: "câu hỏi", options: "lựa chọn", answers: "đáp án", materials: "material", media: "media", "writing-tasks": "Writing task", "writing-samples": "bài mẫu Writing", "speaking-tasks": "Speaking task", "speaking-items": "câu hỏi Speaking", "speaking-samples": "bài mẫu Speaking" };

export default function AdminExamDetail() {
  const { type, id } = useParams();
  const [search] = useSearchParams();
  const readOnly = search.get("preview") === "1";
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [createModal, setCreateModal] = useState(null);
  const [createForm, setCreateForm] = useState({});
  const [creating, setCreating] = useState(false);
  const confirm = useConfirmDialog();
  useEffect(() => { setLoading(true); adminExamService.detail(type, id).then((d) => { setDetail(d); setForm({ examCode: d.exam.examCode, examName: d.exam.examName, status: d.exam.status, listeningAudioUrl: d.listeningAudioUrl || "" }); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [type, id]);
  const original = useMemo(() => detail ? { examCode: detail.exam.examCode, examName: detail.exam.examName, status: detail.exam.status, listeningAudioUrl: detail.listeningAudioUrl || "" } : null, [detail]);
  const changed = form && original && JSON.stringify(form) !== JSON.stringify(original);
  const saveMetadata = async (e) => { e.preventDefault(); setSaving(true); setError(""); try { const d = await adminExamService.update(type, id, form); setDetail(d); setForm({ examCode:d.exam.examCode, examName:d.exam.examName, status:d.exam.status, listeningAudioUrl:d.listeningAudioUrl || "" }); } catch (x) { setError(x.message); } finally { setSaving(false); } };
  const save = async (resource, recordId, body) => { setError(""); try { setDetail(await adminExamService.content(type, id, resource, recordId, body)); } catch (e) { setError(e.message); throw e; } };
  const add = (resource, parentId = null) => {
    const defaults = { parentId, skill: type === "ielts" ? "LISTENING" : "LISTENING", type: resource === "questions" ? "" : resource === "media" || resource === "materials" ? "audio" : "", correctAnswer: "A", minWords: 150 };
    setCreateForm(defaults); setCreateModal({ resource, parentId }); setError("");
  };
  const submitCreate = async (event) => {
    event.preventDefault(); setCreating(true); setError("");
    try {
      const payload = Object.fromEntries(Object.entries(createForm).map(([key, value]) => {
        if (["parentId", "partNo", "groupNo", "blockNo", "taskNo", "questionNo", "displayOrder", "minWords", "maxAnswers"].includes(key)) return [key, value === "" || value == null ? null : Number(value)];
        return [key, value];
      }));
      setDetail(await adminExamService.addContent(type, id, createModal.resource, payload));
      setCreateModal(null);
    } catch (e) { setError(e.message); }
    finally { setCreating(false); }
  };
  const remove = async (resource, recordId) => {
    const ok = await confirm({ title: `Xóa ${RESOURCE_LABELS[resource]}?`, message: "Node này và toàn bộ nội dung con sẽ bị xóa. Thao tác không thể hoàn tác.", confirmLabel: "Xóa", tone: "danger" });
    if (!ok) return;
    setError("");
    try { setDetail(await adminExamService.deleteContent(type, id, resource, recordId)); }
    catch (e) { setError(e.message); }
  };
  const uploadIntoCreate = async (file, resourceType, field) => {
    const result = await adminExamService.uploadMedia(file, resourceType);
    setCreateForm((current) => ({ ...current, [field]: result.url }));
  };
  if (loading) return <div className={styles.state}>Đang tải cấu trúc đề thi…</div>;
  if (!detail) return <div className={styles.state}><p>{error || "Không tìm thấy đề thi."}</p><Link to="/admin/toeic-exams">Quay lại</Link></div>;
  return <main className={styles.page}>
    <div className={styles.header}><div><Link to="/admin/toeic-exams">← Danh sách đề thi</Link><h1>{readOnly ? "Xem trước" : "Chi tiết và chỉnh sửa"} {type.toUpperCase()}</h1><p>{detail.exam.examName} · {detail.exam.examCode}</p></div>{readOnly && <span className={styles.preview}>Chế độ chỉ đọc · không tạo lượt làm</span>}</div>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.card}><h2>Thông tin chung</h2><form className={styles.metaForm} onSubmit={saveMetadata}>
      <label>Mã đề<input required disabled={readOnly} value={form.examCode} onChange={(e) => setForm({...form, examCode:e.target.value})}/></label><label>Tên đề<input required disabled={readOnly} value={form.examName} onChange={(e) => setForm({...form, examName:e.target.value})}/></label><label>Trạng thái<select disabled={readOnly} value={form.status} onChange={(e) => setForm({...form, status:e.target.value})}><option value="published">published</option><option value="hidden">hidden</option><option value="draft">draft</option><option value="active">active</option><option value="ready">ready</option></select></label>
      {type === "toeic" && <label className={styles.wide}>Audio Listening<input required disabled={readOnly} value={form.listeningAudioUrl} onChange={(e) => setForm({...form, listeningAudioUrl:e.target.value})}/><LinkValue value={form.listeningAudioUrl}/>{!readOnly && <UploadField resourceType="audio" onUploaded={(url) => setForm((current) => ({ ...current, listeningAudioUrl: url }))}/>}</label>}{!readOnly && <div className={styles.formActions}><button type="button" disabled={!changed || saving} onClick={() => setForm(original)}>Hủy</button><button className={styles.primary} disabled={!changed || saving}>{saving ? "Đang lưu…" : "Lưu metadata"}</button></div>}
    </form></section>
    <section className={styles.card}><div className={styles.sectionTitle}><h2>Cấu trúc đề ({detail.exam.questionCount} câu)</h2><NodeActions readOnly={readOnly} onAdd={() => add("groups")} addLabel="group"/></div>{detail.groups.length === 0 && <p className={styles.muted}>Chưa có group Listening / Reading.</p>}{detail.groups.map((group) => <details className={styles.accordion} key={group.id}><summary><span>{group.skill || group.type} · Part/Section {group.partNo ?? "—"} · Group {group.groupNo ?? "—"}</span><b>{group.blocks?.reduce((n,b) => n + b.questions.length, 0) || group.questions?.length || 0} câu</b></summary><div className={styles.body}>
      <NodeActions readOnly={readOnly} onAdd={() => add(type === "toeic" ? "questions" : "blocks", group.id)} addLabel={type === "toeic" ? "câu hỏi" : "block"} onDelete={() => remove("groups", group.id)}/>
      <Editor label="Tiêu đề" value={group.title} field="title" readOnly={readOnly} onSave={(b) => save("groups",group.id,b)}/><Editor label="Hướng dẫn" value={group.instruction} field="instruction" readOnly={readOnly} onSave={(b) => save("groups",group.id,b)}/><Editor label="Nội dung chung / Script" value={group.sharedText} field="sharedText" readOnly={readOnly} onSave={(b) => save("groups",group.id,b)}/>
      {type === "toeic" && <NodeActions readOnly={readOnly} onAdd={() => add("materials", group.id)} addLabel="material"/>}
      {group.media?.map((m) => <div className={styles.subcard} key={m.id}><NodeActions readOnly={readOnly} onDelete={() => remove("materials",m.id)}/><b>{m.type}</b><LinkValue value={m.assetUrl}/><Editor label="Nội dung media" value={m.content} field="content" readOnly={readOnly} onSave={(b) => save("materials",m.id,b)}/><Editor label="URL" value={m.assetUrl} field="assetUrl" readOnly={readOnly} onSave={(b) => save("materials",m.id,b)}/>{!readOnly && <UploadField resourceType={m.type?.toLowerCase().includes("image") ? "image" : "audio"} onUploaded={(url) => save("materials", m.id, { assetUrl: url })}/>}</div>)}
      {group.questions?.map((q) => <Question key={q.id} q={q} readOnly={readOnly} save={save} type={type} add={add} remove={remove}/>)}
      {group.blocks?.map((block) => <details className={styles.nested} key={block.id}><summary>Block {block.number} · {block.type} · {block.questions.length} câu</summary><div className={styles.body}><NodeActions readOnly={readOnly} onAdd={() => add("questions", block.id)} addLabel="câu hỏi" onDelete={() => remove("blocks",block.id)}/><Editor label="Hướng dẫn block" value={block.instruction} field="instruction" readOnly={readOnly} onSave={(b) => save("blocks",block.id,b)}/>{block.questions.map((q) => <Question key={q.id} q={q} readOnly={readOnly} save={save} type={type} add={add} remove={remove}/>)}</div></details>)}</div></details>)}</section>
    {type === "ielts" && <section className={styles.card}><div className={styles.sectionTitle}><h2>Writing Task 1–2</h2><NodeActions readOnly={readOnly} onAdd={() => add("writing-tasks")} addLabel="Writing task"/></div>{detail.writingTasks.length === 0 && <p className={styles.muted}>Chưa có Writing task.</p>}{detail.writingTasks.map((t) => <details className={styles.accordion} key={t.id}><summary>Task {t.taskNo} · {t.taskType}</summary><div className={styles.body}><NodeActions readOnly={readOnly} onDelete={() => remove("writing-tasks",t.id)}/><Editor label="Hướng dẫn" value={t.instruction} field="instruction" readOnly={readOnly} required onSave={(b) => save("writing-tasks",t.id,b)}/><Editor label="Đề bài" value={t.prompt} field="promptText" readOnly={readOnly} required onSave={(b) => save("writing-tasks",t.id,b)}/><Options options={t.samples} readOnly={readOnly} save={save} resource="writing-samples" answer onAdd={() => add("writing-samples",t.id)} onDelete={remove}/></div></details>)}</section>}
    {type === "ielts" && <section className={styles.card}><div className={styles.sectionTitle}><h2>Speaking Part 1–3</h2><NodeActions readOnly={readOnly} onAdd={() => add("speaking-tasks")} addLabel="Speaking task"/></div>{detail.speakingTasks.length === 0 && <p className={styles.muted}>Chưa có Speaking task.</p>}{detail.speakingTasks.map((t) => <details className={styles.accordion} key={t.id}><summary>Part {t.partNo} · {t.title}</summary><div className={styles.body}><NodeActions readOnly={readOnly} onDelete={() => remove("speaking-tasks",t.id)}/><Editor label="Chủ đề" value={t.title} field="topicTitle" readOnly={readOnly} onSave={(b) => save("speaking-tasks",t.id,b)}/><Editor label="Hướng dẫn" value={t.instruction} field="instruction" readOnly={readOnly} onSave={(b) => save("speaking-tasks",t.id,b)}/><Options options={t.items} readOnly={readOnly} save={save} resource="speaking-items" onAdd={() => add("speaking-items",t.id)} onDelete={remove}/><Options options={t.samples} readOnly={readOnly} save={save} resource="speaking-samples" answer onAdd={() => add("speaking-samples",t.id)} onDelete={remove}/></div></details>)}</section>}
    {type === "ielts" && <section className={styles.card}><div className={styles.sectionTitle}><h2>Audio / Image / Media IELTS</h2><NodeActions readOnly={readOnly} onAdd={() => add("media")} addLabel="media"/></div>{detail.media.length === 0 && <p className={styles.muted}>Chưa có media.</p>}{detail.media.map((m) => <div className={styles.mediaRow} key={m.id}><NodeActions readOnly={readOnly} onDelete={() => remove("media",m.id)}/><b>{m.content} · {m.type}</b><LinkValue value={m.assetUrl}/><Editor label="URL media" value={m.assetUrl} field="assetUrl" readOnly={readOnly} onSave={(b) => save("media",m.id,b)}/>{!readOnly && <UploadField resourceType={m.type?.toLowerCase().includes("image") ? "image" : "audio"} onUploaded={(url) => save("media",m.id,{assetUrl:url})}/>}</div>)}</section>}
    <AdminModal open={Boolean(createModal)} title={`Thêm ${RESOURCE_LABELS[createModal?.resource] || "nội dung"}`} onClose={() => !creating && setCreateModal(null)} size="md" footer={<><button type="button" className={styles.modalSecondary} onClick={() => setCreateModal(null)} disabled={creating}>Hủy</button><button type="submit" form="exam-content-create" className={styles.modalPrimary} disabled={creating}>{creating ? "Đang thêm…" : "Thêm"}</button></>}>
      <form id="exam-content-create" className={styles.createForm} onSubmit={submitCreate}>
        {(CREATE_FIELDS[createModal?.resource] || []).filter(([field]) => {
          if (createModal?.resource === "questions") return type === "toeic" ? field !== "promptText" : !["questionText","correctAnswer","transcript","imageUrl"].includes(field);
          if (createModal?.resource === "options") return type === "toeic" ? field !== "optionKey" : field !== "optionLabel";
          if (createModal?.resource === "groups") return type === "toeic" || field !== "type";
          return true;
        }).map(([field,label,kind]) => <label key={field}>{label}{kind === "select" ? <select value={createForm[field] || "LISTENING"} onChange={(e) => setCreateForm({...createForm,[field]:e.target.value})}><option>LISTENING</option><option>READING</option></select> : kind?.startsWith("textarea") ? <textarea required={kind.includes("required")} value={createForm[field] ?? ""} onChange={(e) => setCreateForm({...createForm,[field]:e.target.value})}/> : <input required={kind === "required"} type={kind === "number" ? "number" : "text"} value={createForm[field] ?? ""} onChange={(e) => setCreateForm({...createForm,[field]:e.target.value})}/>}</label>)}
        {["questions","materials","media"].includes(createModal?.resource) && <label>Tải file trực tiếp<input type="file" accept="image/*,audio/*" onChange={async (e) => { const file=e.target.files?.[0]; if (file) try { await uploadIntoCreate(file,file.type.startsWith("audio/") ? "audio" : "image",createModal.resource === "questions" ? "imageUrl" : "assetUrl"); } catch (x) { setError(x.message); } }}/></label>}
      </form>
    </AdminModal>
  </main>;
}
