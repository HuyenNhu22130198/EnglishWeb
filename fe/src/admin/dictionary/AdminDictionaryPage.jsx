import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminDictionaryAPI } from './adminDictionaryService';
import styles from './AdminDictionaryPage.module.css';

const emptyForm = {
  keywordNormalized: '',
  word: '',
  phonetic: '',
  audioUrl: '',
  englishMeaning: '',
  vietnameseMeaning: '',
  synonymsJson: '[]',
  wordTypesJson: '[]',
  wordFormsJson: '[]',
  exampleEn: '',
  exampleVi: '',
  source: '',
  status: 'REVIEWED',
};

const truncate = (value, max = 80) => {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const formatDate = (value) => {
  if (!value) return '';

  try {
    return new Date(value).toLocaleString('vi-VN');
  } catch {
    return value;
  }
};

const AdminDictionaryPage = () => {
  const [entries, setEntries] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [generateKeyword, setGenerateKeyword] = useState('');

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const pageTitle = useMemo(() => {
    return `Quản lý từ vựng`;
  }, []);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const data = await adminDictionaryAPI.getEntries({
        keyword,
        page,
        size,
      });

      setEntries(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách từ vựng.');
    } finally {
      setLoading(false);
    }
  }, [keyword, page, size]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    loadEntries();
  };

  const handleGenerate = async (e) => {
    e.preventDefault();

    const word = generateKeyword.trim();

    if (!word) {
      setError('Vui lòng nhập từ cần generate.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const generated = await adminDictionaryAPI.generateEntry(word);

      setGenerateKeyword('');
      setSuccess(`Đã generate từ "${generated.word}".`);

      setKeyword('');
      setPage(0);
      await loadEntries();
    } catch (err) {
      setError(err.message || 'Generate từ vựng thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (entry) => {
    setSelectedEntry(entry);

    setForm({
      keywordNormalized: entry.keywordNormalized || '',
      word: entry.word || '',
      phonetic: entry.phonetic || '',
      audioUrl: entry.audioUrl || '',
      englishMeaning: entry.englishMeaning || '',
      vietnameseMeaning: entry.vietnameseMeaning || '',
      synonymsJson: entry.synonymsJson || '[]',
      wordTypesJson: entry.wordTypesJson || '[]',
      wordFormsJson: entry.wordFormsJson || '[]',
      exampleEn: entry.exampleEn || '',
      exampleVi: entry.exampleVi || '',
      source: entry.source || '',
      status: entry.status || 'REVIEWED',
    });
  };

  const closeEditModal = () => {
    setSelectedEntry(null);
    setForm(emptyForm);
  };

  const updateFormValue = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!selectedEntry) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await adminDictionaryAPI.updateEntry(selectedEntry.id, form);

      setSuccess(`Đã cập nhật từ "${form.word}".`);
      closeEditModal();
      await loadEntries();
    } catch (err) {
      setError(err.message || 'Cập nhật từ vựng thất bại.');
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
      setError('');
      setSuccess('');

      await adminDictionaryAPI.deleteEntry(entry.id);

      setSuccess(`Đã xóa từ "${entry.word}".`);
      await loadEntries();
    } catch (err) {
      setError(err.message || 'Xóa từ vựng thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin / Dictionary</p>
          <h1>{pageTitle}</h1>
          <p>
            Quản lý dữ liệu trong bảng <strong>dictionary_entries</strong>.
            Tổng số: <strong>{totalElements}</strong> từ.
          </p>
        </div>

        <form className={styles.generateBox} onSubmit={handleGenerate}>
          <input
            value={generateKeyword}
            onChange={(e) => setGenerateKeyword(e.target.value)}
            placeholder="Nhập từ mới, ví dụ: reimbursement"
          />

          <button type="submit" disabled={saving}>
            {saving ? 'Đang tạo...' : 'Generate'}
          </button>
        </form>
      </section>

      <section className={styles.toolbar}>
        <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo keyword_normalized hoặc word..."
          />

          <button type="submit">Tìm</button>

          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => {
              setKeyword('');
              setPage(0);
            }}
          >
            Xóa lọc
          </button>
        </form>

        <select
          value={size}
          onChange={(e) => {
            setSize(Number(e.target.value));
            setPage(0);
          }}
        >
          <option value={10}>10 dòng</option>
          <option value={20}>20 dòng</option>
          <option value={50}>50 dòng</option>
        </select>
      </section>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2>Danh sách từ vựng</h2>

          <span>
            Trang {totalPages === 0 ? 0 : page + 1}/{totalPages}
          </span>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
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
                  <td colSpan="17" className={styles.emptyCell}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="17" className={styles.emptyCell}>
                    Chưa có dữ liệu.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.id}</td>
                    <td>{entry.keywordNormalized}</td>
                    <td className={styles.strongCell}>{entry.word}</td>
                    <td>{entry.phonetic}</td>
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
                    <td>{entry.source}</td>
                    <td>
                      <span className={styles.statusPill}>
                        {entry.status || 'N/A'}
                      </span>
                    </td>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td>{formatDate(entry.updatedAt)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button type="button" onClick={() => openEditModal(entry)}>
                          Sửa
                        </button>

                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => handleDelete(entry)}
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

        <div className={styles.pagination}>
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          >
            Trang trước
          </button>

          <span>
            {totalPages === 0 ? 0 : page + 1} / {totalPages}
          </span>

          <button
            type="button"
            disabled={totalPages === 0 || page >= totalPages - 1}
            onClick={() =>
              setPage((prev) => Math.min(prev + 1, totalPages - 1))
            }
          >
            Trang sau
          </button>
        </div>
      </section>

      {selectedEntry ? (
        <div className={styles.modalBackdrop}>
          <form className={styles.modal} onSubmit={handleUpdate}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Edit dictionary entry</p>
                <h2>{selectedEntry.word}</h2>
              </div>

              <button type="button" onClick={closeEditModal}>
                Đóng
              </button>
            </div>

            <div className={styles.formGrid}>
              <label>
                keyword_normalized
                <input
                  value={form.keywordNormalized}
                  onChange={(e) =>
                    updateFormValue('keywordNormalized', e.target.value)
                  }
                />
              </label>

              <label>
                word
                <input
                  value={form.word}
                  onChange={(e) => updateFormValue('word', e.target.value)}
                />
              </label>

              <label>
                phonetic
                <input
                  value={form.phonetic}
                  onChange={(e) => updateFormValue('phonetic', e.target.value)}
                />
              </label>

              <label>
                audio_url
                <input
                  value={form.audioUrl}
                  onChange={(e) => updateFormValue('audioUrl', e.target.value)}
                />
              </label>

              <label>
                source
                <input
                  value={form.source}
                  onChange={(e) => updateFormValue('source', e.target.value)}
                />
              </label>

              <label>
                status
                <select
                  value={form.status}
                  onChange={(e) => updateFormValue('status', e.target.value)}
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
                  onChange={(e) =>
                    updateFormValue('vietnameseMeaning', e.target.value)
                  }
                />
              </label>

              <label>
                english_meaning
                <textarea
                  value={form.englishMeaning}
                  onChange={(e) =>
                    updateFormValue('englishMeaning', e.target.value)
                  }
                />
              </label>

              <label>
                synonyms_json
                <textarea
                  value={form.synonymsJson}
                  onChange={(e) =>
                    updateFormValue('synonymsJson', e.target.value)
                  }
                />
              </label>

              <label>
                word_types_json
                <textarea
                  value={form.wordTypesJson}
                  onChange={(e) =>
                    updateFormValue('wordTypesJson', e.target.value)
                  }
                />
              </label>

              <label>
                word_forms_json
                <textarea
                  value={form.wordFormsJson}
                  onChange={(e) =>
                    updateFormValue('wordFormsJson', e.target.value)
                  }
                />
              </label>

              <label>
                example_en
                <textarea
                  value={form.exampleEn}
                  onChange={(e) => updateFormValue('exampleEn', e.target.value)}
                />
              </label>

              <label>
                example_vi
                <textarea
                  value={form.exampleVi}
                  onChange={(e) => updateFormValue('exampleVi', e.target.value)}
                />
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" onClick={closeEditModal}>
                Hủy
              </button>

              <button type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
};

export default AdminDictionaryPage;