import { useCallback, useEffect, useState } from "react";
import { adminDictionaryAPI } from "./adminDictionaryService";
import AdminPageHeader from "../components/AdminPageHeader";
import Pagination from "../components/Pagination";
import {
  BookIcon,
  RefreshIcon,
  SearchIcon,
} from "../components/AdminIcons";
import AdminModal from "../components/AdminModal";
import styles from "./AdminDictionaryPage.module.css";
import shared from "../AdminShared.module.css";

const emptyForm = {
  keywordNormalized: "",
  word: "",
  phonetic: "",
  audioUrl: "",
  englishMeaning: "",
  vietnameseMeaning: "",
  synonymsJson: "[]",
  wordTypesJson: "[]",
  wordFormsJson: "[]",
  exampleEn: "",
  exampleVi: "",
  source: "",
  status: "REVIEWED",
};

function truncate(value, max = 80) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN");
}

function normalizeResponse(data) {
  if (Array.isArray(data)) {
    return {
      content: data,
      totalPages: 1,
      totalElements: data.length,
    };
  }

  return {
    content: data?.content || [],
    totalPages: data?.totalPages || 0,
    totalElements: data?.totalElements || 0,
  };
}

export default function AdminDictionaryPage() {
  const [entries, setEntries] = useState([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [generateKeyword, setGenerateKeyword] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const pageTitle = "Quản lý từ vựng";

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await adminDictionaryAPI.getEntries({
        keyword,
        page,
        size,
      });

      const normalized = normalizeResponse(data);
      setEntries(normalized.content);
      setTotalPages(normalized.totalPages);
      setTotalElements(normalized.totalElements);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách từ vựng.");
    } finally {
      setLoading(false);
    }
  }, [keyword, page, size]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const openCreateModal = () => {
    setGenerateKeyword("");
    setGenerateModalOpen(true);
    setError("");
  };

  const closeGenerateModal = () => {
    if (saving) return;
    setGenerateKeyword("");
    setGenerateModalOpen(false);
  };

  const openEditModal = (entry) => {
    setSelectedEntry(entry);
    setForm({
      keywordNormalized: entry.keywordNormalized || "",
      word: entry.word || "",
      phonetic: entry.phonetic || "",
      audioUrl: entry.audioUrl || "",
      englishMeaning: entry.englishMeaning || "",
      vietnameseMeaning: entry.vietnameseMeaning || "",
      synonymsJson: entry.synonymsJson || "[]",
      wordTypesJson: entry.wordTypesJson || "[]",
      wordFormsJson: entry.wordFormsJson || "[]",
      exampleEn: entry.exampleEn || "",
      exampleVi: entry.exampleVi || "",
      source: entry.source || "",
      status: entry.status || "REVIEWED",
    });
  };

  const closeModal = () => {
    setSelectedEntry(null);
    setForm(emptyForm);
  };

  const updateFormValue = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  const handleRefresh = () => {
    loadEntries();
  };

  const handleGenerateEntry = async (event) => {
    event.preventDefault();

    const trimmedWord = generateKeyword.trim();
    if (!trimmedWord) {
      setError("Vui lòng nhập từ tiếng Anh muốn thêm.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const generated = await adminDictionaryAPI.generateEntry(trimmedWord);
      setSuccess(`Đã tự động tạo từ "${generated.word || trimmedWord}".`);
      setGenerateModalOpen(false);
      setGenerateKeyword("");

      await loadEntries();

      setSelectedEntry(generated);
      setForm({
        keywordNormalized: generated.keywordNormalized || "",
        word: generated.word || "",
        phonetic: generated.phonetic || "",
        audioUrl: generated.audioUrl || "",
        englishMeaning: generated.englishMeaning || "",
        vietnameseMeaning: generated.vietnameseMeaning || "",
        synonymsJson: generated.synonymsJson || "[]",
        wordTypesJson: generated.wordTypesJson || "[]",
        wordFormsJson: generated.wordFormsJson || "[]",
        exampleEn: generated.exampleEn || "",
        exampleVi: generated.exampleVi || "",
        source: generated.source || "",
        status: generated.status || "REVIEWED",
      });
    } catch (err) {
      setError(err.message || "Tự động tạo từ vựng thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!selectedEntry || !selectedEntry.id) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await adminDictionaryAPI.updateEntry(selectedEntry.id, form);
      setSuccess(`Đã cập nhật từ "${form.word}".`);

      closeModal();
      await loadEntries();
    } catch (err) {
      setError(err.message || "Cập nhật từ vựng thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa từ "${entry.word}" không?`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await adminDictionaryAPI.deleteEntry(entry.id);
      setSuccess(`Đã xóa từ "${entry.word}".`);
      await loadEntries();
    } catch (err) {
      setError(err.message || "Xóa từ vựng thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const pageCount = totalPages || (entries.length > 0 ? 1 : 0);

  return (
    <div className={shared.page}>
      <AdminPageHeader
        title={pageTitle}
        subtitle="Quản lý nội dung từ điển, nghĩa tiếng Việt, phát âm, ví dụ và các dạng từ."
      >
        <button
          type="button"
          className={shared.secondaryButton}
          onClick={handleRefresh}
          disabled={loading || saving}
        >
          <RefreshIcon size={18} />
          Làm mới
        </button>

        <button
          type="button"
          className={shared.primaryButton}
          onClick={openCreateModal}
          disabled={saving}
        >
          <BookIcon size={18} />
          Thêm từ mới
        </button>
      </AdminPageHeader>

      {error ? <div className={shared.errorBox}>{error}</div> : null}
      {success ? <div className={shared.resultSummary}>{success}</div> : null}

      <section className={shared.panel}>
        <form className={shared.toolbar} onSubmit={handleSearchSubmit}>
          <div className={shared.searchWrap}>
            <span className={shared.searchIcon}>
              <SearchIcon size={19} />
            </span>

            <input
              className={shared.searchInput}
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="Tìm theo từ tiếng Anh hoặc nghĩa tiếng Việt..."
            />
          </div>

          <select
            className={shared.select}
            value={size}
            onChange={(event) => {
              setPage(0);
              setSize(Number(event.target.value));
            }}
          >
            <option value={10}>10 dòng</option>
            <option value={20}>20 dòng</option>
            <option value={50}>50 dòng</option>
          </select>
        </form>

        <div className={shared.resultSummary}>
          Hiển thị <strong>{entries.length}</strong> /{" "}
          <strong>{totalElements}</strong> từ vựng
        </div>

        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>id</th>
                <th>keyword_normalized</th>
                <th>word</th>
                <th>phonetic</th>
                <th>audio_url</th>
                <th>vietnamese_meaning</th>
                <th>english_meaning</th>
                <th>synonyms_json</th>
                <th>word_types_json</th>
                <th>word_forms_json</th>
                <th>example_en</th>
                <th>example_vi</th>
                <th>source</th>
                <th>status</th>
                <th>created_at</th>
                <th>updated_at</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={17} className={shared.emptyState}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={17} className={shared.emptyState}>
                    Chưa có dữ liệu.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.id}</td>
                    <td>{entry.keywordNormalized || "—"}</td>
                    <td className={styles.strongCell}>{entry.word || "—"}</td>
                    <td>{entry.phonetic || "—"}</td>
                    <td title={entry.audioUrl}>{truncate(entry.audioUrl, 44)}</td>
                    <td title={entry.vietnameseMeaning}>
                      {truncate(entry.vietnameseMeaning, 70)}
                    </td>
                    <td title={entry.englishMeaning}>
                      {truncate(entry.englishMeaning, 90)}
                    </td>
                    <td title={entry.synonymsJson}>
                      {truncate(entry.synonymsJson, 60)}
                    </td>
                    <td title={entry.wordTypesJson}>
                      {truncate(entry.wordTypesJson, 60)}
                    </td>
                    <td title={entry.wordFormsJson}>
                      {truncate(entry.wordFormsJson, 60)}
                    </td>
                    <td title={entry.exampleEn}>{truncate(entry.exampleEn, 70)}</td>
                    <td title={entry.exampleVi}>{truncate(entry.exampleVi, 70)}</td>
                    <td>{entry.source || "—"}</td>
                    <td>
                      <span className={styles.statusPill}>
                        {entry.status || "—"}
                      </span>
                    </td>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td>{formatDate(entry.updatedAt)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          onClick={() => openEditModal(entry)}
                          disabled={saving}
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => handleDelete(entry)}
                          disabled={saving}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={shared.panelFooter}>
          <div className={shared.footerInfo}>
            Trang <strong>{pageCount === 0 ? 0 : page + 1}</strong> /{" "}
            <strong>{pageCount}</strong>
          </div>

          <Pagination
            currentPage={page + 1}
            totalPages={pageCount}
            onPageChange={(nextPage) => setPage(nextPage - 1)}
          />
        </div>
      </section>

      <AdminModal
        open={generateModalOpen}
        title="Thêm từ mới"
        description="Nhập từ tiếng Anh, hệ thống sẽ tự động sinh dữ liệu ban đầu để bạn rà soát trước khi lưu dùng."
        onClose={closeGenerateModal}
        footer={
          <>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={closeGenerateModal}
              disabled={saving}
            >
              Hủy
            </button>

            <button
              type="submit"
              form="generate-dictionary-form"
              className={shared.primaryButton}
              disabled={saving}
            >
              {saving ? "Đang tạo..." : "Tạo dữ liệu"}
            </button>
          </>
        }
      >
        <form
          id="generate-dictionary-form"
          onSubmit={handleGenerateEntry}
          className={styles.generateForm}
        >
          <label className={styles.generateLabel}>
            Từ tiếng Anh
            <input
              value={generateKeyword}
              onChange={(event) => setGenerateKeyword(event.target.value)}
              placeholder="Ví dụ: improve, environment, look after"
              autoFocus
            />
          </label>

          <div className={styles.generateHint}>
            Sau khi tạo xong, hệ thống sẽ mở form chỉnh sửa để bạn kiểm tra lại nghĩa,
            ví dụ, phiên âm và trạng thái của từ.
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={Boolean(selectedEntry)}
        size="lg"
        title={selectedEntry?.id ? "Chỉnh sửa từ vựng" : "Thêm từ mới"}
        description="Cập nhật thông tin từ điển và các trường dữ liệu liên quan."
        onClose={() => {
          if (!saving) closeModal();
        }}
        footer={
          <>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={closeModal}
              disabled={saving}
            >
              Hủy
            </button>

            <button
              type="submit"
              form="dictionary-form"
              className={shared.primaryButton}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </>
        }
      >
        <form id="dictionary-form" onSubmit={handleUpdate} className={styles.form}>
          <div className={styles.formGrid}>
            <label>
              keyword_normalized
              <input
                value={form.keywordNormalized}
                onChange={(event) =>
                  updateFormValue("keywordNormalized", event.target.value)
                }
              />
            </label>

            <label>
              word
              <input
                value={form.word}
                onChange={(event) => updateFormValue("word", event.target.value)}
              />
            </label>

            <label>
              phonetic
              <input
                value={form.phonetic}
                onChange={(event) =>
                  updateFormValue("phonetic", event.target.value)
                }
              />
            </label>

            <label>
              audio_url
              <input
                value={form.audioUrl}
                onChange={(event) =>
                  updateFormValue("audioUrl", event.target.value)
                }
              />
            </label>

            <label>
              source
              <input
                value={form.source}
                onChange={(event) => updateFormValue("source", event.target.value)}
              />
            </label>

            <label>
              status
              <select
                value={form.status}
                onChange={(event) => updateFormValue("status", event.target.value)}
              >
                <option value="AUTO_GENERATED">AUTO_GENERATED</option>
                <option value="REVIEWED">REVIEWED</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </label>
          </div>

          <div className={styles.textareaGrid}>
            <label>
              vietnamese_meaning
              <textarea
                value={form.vietnameseMeaning}
                onChange={(event) =>
                  updateFormValue("vietnameseMeaning", event.target.value)
                }
              />
            </label>

            <label>
              english_meaning
              <textarea
                value={form.englishMeaning}
                onChange={(event) =>
                  updateFormValue("englishMeaning", event.target.value)
                }
              />
            </label>

            <label>
              synonyms_json
              <textarea
                value={form.synonymsJson}
                onChange={(event) =>
                  updateFormValue("synonymsJson", event.target.value)
                }
              />
            </label>

            <label>
              word_types_json
              <textarea
                value={form.wordTypesJson}
                onChange={(event) =>
                  updateFormValue("wordTypesJson", event.target.value)
                }
              />
            </label>

            <label>
              word_forms_json
              <textarea
                value={form.wordFormsJson}
                onChange={(event) =>
                  updateFormValue("wordFormsJson", event.target.value)
                }
              />
            </label>

            <label>
              example_en
              <textarea
                value={form.exampleEn}
                onChange={(event) =>
                  updateFormValue("exampleEn", event.target.value)
                }
              />
            </label>

            <label>
              example_vi
              <textarea
                value={form.exampleVi}
                onChange={(event) =>
                  updateFormValue("exampleVi", event.target.value)
                }
              />
            </label>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
