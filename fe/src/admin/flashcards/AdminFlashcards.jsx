import { useCallback, useEffect, useState } from 'react';
import { useConfirmDialog } from '../../contexts/useConfirmDialog';
import AdminModal from '../components/AdminModal';
import AdminPageHeader from '../components/AdminPageHeader';
import { BookIcon, RefreshIcon } from '../components/AdminIcons';
import shared from '../AdminShared.module.css';
import { adminFlashcardAPI } from './adminFlashcardService';
import styles from './AdminFlashcards.module.css';

const emptyDeckForm = {
  name: '',
  description: '',
  level: 'Basic',
  displayOrder: 0,
  active: true,
};

const emptyCardForm = {
  term: '',
  pronunciation: '',
  wordType: '',
  meaning: '',
  example: '',
  displayOrder: 0,
};

export default function AdminFlashcards() {
  const confirm = useConfirmDialog();
  const [decks, setDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [savingDeck, setSavingDeck] = useState(false);
  const [deckError, setDeckError] = useState('');
  const [deckSuccess, setDeckSuccess] = useState('');
  const [editingDeck, setEditingDeck] = useState(null);
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [deckForm, setDeckForm] = useState(emptyDeckForm);

  const [activeDeck, setActiveDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [cardError, setCardError] = useState('');
  const [cardSuccess, setCardSuccess] = useState('');
  const [editingCard, setEditingCard] = useState(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardForm, setCardForm] = useState(emptyCardForm);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importErrors, setImportErrors] = useState([]);

  const loadDecks = useCallback(async () => {
    try {
      setLoadingDecks(true);
      setDeckError('');
      setDecks(await adminFlashcardAPI.getDecks());
    } catch (err) {
      setDeckError(err.message || 'Không thể tải danh sách bộ flashcard.');
    } finally {
      setLoadingDecks(false);
    }
  }, []);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const loadCards = useCallback(async (deckId) => {
    try {
      setLoadingCards(true);
      setCardError('');
      setCards(await adminFlashcardAPI.getDeckCards(deckId));
    } catch (err) {
      setCardError(err.message || 'Không thể tải flashcard trong bộ này.');
    } finally {
      setLoadingCards(false);
    }
  }, []);

  const openDeckCreate = () => {
    setEditingDeck(null);
    setDeckForm(emptyDeckForm);
    setDeckError('');
    setDeckModalOpen(true);
  };

  const openDeckEdit = (deck) => {
    setEditingDeck(deck);
    setDeckForm({
      name: deck.name || '',
      description: deck.description || '',
      level: deck.level || 'Basic',
      displayOrder: deck.displayOrder ?? 0,
      active: Boolean(deck.active),
    });
    setDeckError('');
    setDeckModalOpen(true);
  };

  const closeDeckModal = () => {
    if (savingDeck) return;
    setEditingDeck(null);
    setDeckForm(emptyDeckForm);
    setDeckModalOpen(false);
  };

  const updateDeckForm = (field, value) => {
    setDeckForm((current) => ({ ...current, [field]: value }));
  };

  const saveDeck = async (event) => {
    event.preventDefault();

    try {
      setSavingDeck(true);
      setDeckError('');
      setDeckSuccess('');

      const payload = {
        ...deckForm,
        displayOrder: Number(deckForm.displayOrder) || 0,
      };

      if (editingDeck?.id) {
        await adminFlashcardAPI.updateDeck(editingDeck.id, payload);
        setDeckSuccess('Đã cập nhật bộ flashcard.');
      } else {
        await adminFlashcardAPI.createDeck(payload);
        setDeckSuccess('Đã thêm bộ flashcard.');
      }

      closeDeckModal();
      await loadDecks();
    } catch (err) {
      setDeckError(err.message || 'Không thể lưu bộ flashcard.');
    } finally {
      setSavingDeck(false);
    }
  };

  const deleteDeck = async (deck) => {
    const confirmed = await confirm({
      title: 'Xóa bộ flashcard?',
      message: `Bộ "${deck.name}" và toàn bộ thẻ bên trong sẽ bị xóa.`,
      confirmLabel: 'Xóa bộ',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      setSavingDeck(true);
      setDeckError('');
      setDeckSuccess('');
      await adminFlashcardAPI.deleteDeck(deck.id);
      setDeckSuccess('Đã xóa bộ flashcard.');
      if (activeDeck?.id === deck.id) {
        setActiveDeck(null);
      }
      await loadDecks();
    } catch (err) {
      setDeckError(err.message || 'Không thể xóa bộ flashcard.');
    } finally {
      setSavingDeck(false);
    }
  };

  const toggleDeckStatus = async (deck) => {
    try {
      setSavingDeck(true);
      setDeckError('');
      setDeckSuccess('');

      await adminFlashcardAPI.updateDeck(deck.id, {
        name: deck.name,
        description: deck.description || '',
        level: deck.level || '',
        displayOrder: deck.displayOrder ?? 0,
        active: !deck.active,
      });

      setDeckSuccess(deck.active ? 'Đã ẩn bộ flashcard.' : 'Đã hiện bộ flashcard.');
      await loadDecks();
    } catch (err) {
      setDeckError(err.message || 'Không thể cập nhật trạng thái bộ flashcard.');
    } finally {
      setSavingDeck(false);
    }
  };

  const openDeckCards = (deck) => {
    setActiveDeck(deck);
    setCardError('');
    setCardSuccess('');
    loadCards(deck.id);
  };

  const backToDecks = () => {
    setActiveDeck(null);
    setCards([]);
  };

  const openCardCreate = () => {
    setEditingCard(null);
    setCardForm(emptyCardForm);
    setCardError('');
    setCardModalOpen(true);
  };

  const openCardEdit = (card) => {
    setEditingCard(card);
    setCardForm({
      term: card.term || '',
      pronunciation: card.pronunciation || '',
      wordType: card.wordType || '',
      meaning: card.meaning || '',
      example: card.example || '',
      displayOrder: card.displayOrder ?? 0,
    });
    setCardError('');
    setCardModalOpen(true);
  };

  const closeCardModal = () => {
    if (savingCard) return;
    setEditingCard(null);
    setCardForm(emptyCardForm);
    setCardModalOpen(false);
  };

  const updateCardForm = (field, value) => {
    setCardForm((current) => ({ ...current, [field]: value }));
  };

  const saveCard = async (event) => {
    event.preventDefault();
    if (!activeDeck) return;

    try {
      setSavingCard(true);
      setCardError('');
      setCardSuccess('');

      const payload = {
        ...cardForm,
        displayOrder: Number(cardForm.displayOrder) || 0,
      };

      if (editingCard?.id) {
        await adminFlashcardAPI.updateCard(editingCard.id, payload);
        setCardSuccess('Đã cập nhật flashcard.');
      } else {
        await adminFlashcardAPI.createCard(activeDeck.id, payload);
        setCardSuccess('Đã thêm flashcard.');
      }

      closeCardModal();
      await loadCards(activeDeck.id);
      await loadDecks();
    } catch (err) {
      setCardError(err.message || 'Không thể lưu flashcard.');
    } finally {
      setSavingCard(false);
    }
  };

  const deleteCard = async (card) => {
    const confirmed = await confirm({
      title: 'Xóa flashcard?',
      message: `Thẻ "${card.term}" sẽ bị xóa khỏi bộ "${activeDeck?.name}".`,
      confirmLabel: 'Xóa thẻ',
      tone: 'danger',
    });
    if (!confirmed || !activeDeck) return;

    try {
      setSavingCard(true);
      setCardError('');
      setCardSuccess('');
      await adminFlashcardAPI.deleteCard(card.id);
      setCardSuccess('Đã xóa flashcard.');
      await loadCards(activeDeck.id);
      await loadDecks();
    } catch (err) {
      setCardError(err.message || 'Không thể xóa flashcard.');
    } finally {
      setSavingCard(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      setCardError('');
      await adminFlashcardAPI.downloadImportTemplate();
    } catch (err) {
      setCardError(err.message || 'Không thể tải file mẫu Excel.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const openImportModal = () => {
    setImportFile(null);
    setImportErrors([]);
    setCardError('');
    setImportModalOpen(true);
  };

  const closeImportModal = () => {
    if (importing) return;
    setImportModalOpen(false);
    setImportFile(null);
  };

  const submitImport = async () => {
    if (!activeDeck || !importFile) return;

    try {
      setImporting(true);
      setCardError('');
      setImportErrors([]);
      await adminFlashcardAPI.importCards(activeDeck.id, importFile);
      setCardSuccess('Đã import flashcard từ Excel.');
      setImportModalOpen(false);
      setImportFile(null);
      await loadCards(activeDeck.id);
      await loadDecks();
    } catch (err) {
      if (Array.isArray(err.data) && err.data.length) {
        setImportModalOpen(false);
        setImportErrors(err.data);
      } else {
        setCardError(err.message || 'Không thể import flashcard từ Excel.');
      }
    } finally {
      setImporting(false);
    }
  };

  if (activeDeck) {
    return (
      <div className={shared.page}>
        <AdminPageHeader
          title={`Thẻ trong bộ "${activeDeck.name}"`}
          subtitle="Quản lý các flashcard hiển thị trong bộ này."
        >
          <button type="button" className={shared.secondaryButton} onClick={backToDecks} disabled={savingCard}>
            ← Quay lại danh sách bộ
          </button>
          <button type="button" className={shared.secondaryButton} onClick={downloadTemplate} disabled={downloadingTemplate}>
            {downloadingTemplate ? 'Đang tải...' : 'Tải file mẫu Excel'}
          </button>
          <button type="button" className={shared.secondaryButton} onClick={openImportModal} disabled={savingCard}>
            Import từ Excel
          </button>
          <button type="button" className={shared.primaryButton} onClick={openCardCreate} disabled={savingCard}>
            Thêm flashcard
          </button>
        </AdminPageHeader>

        {cardError ? <div className={shared.errorBox}>{cardError}</div> : null}
        {cardSuccess ? <div className={shared.resultSummary}>{cardSuccess}</div> : null}

        <section className={shared.panel}>
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Từ vựng</th>
                  <th>Phiên âm</th>
                  <th>Từ loại</th>
                  <th>Nghĩa</th>
                  <th>Thứ tự</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingCards ? (
                  <tr><td colSpan={6} className={shared.emptyState}>Đang tải flashcard...</td></tr>
                ) : cards.length === 0 ? (
                  <tr><td colSpan={6} className={shared.emptyState}>Bộ này chưa có flashcard nào.</td></tr>
                ) : (
                  cards.map((card) => (
                    <tr key={card.id}>
                      <td className={styles.termCell}>{card.term}</td>
                      <td>{card.pronunciation || '-'}</td>
                      <td>{card.wordType || '-'}</td>
                      <td className={styles.meaningCell}>{card.meaning}</td>
                      <td>{card.displayOrder}</td>
                      <td>
                        <div className={styles.actions}>
                          <button type="button" onClick={() => openCardEdit(card)} disabled={savingCard}>Sửa</button>
                          <button type="button" className={styles.deleteButton} onClick={() => deleteCard(card)} disabled={savingCard}>Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <AdminModal
          open={cardModalOpen}
          title={editingCard ? 'Chỉnh sửa flashcard' : 'Thêm flashcard'}
          onClose={closeCardModal}
          footer={(
            <>
              <button type="button" className={shared.secondaryButton} onClick={closeCardModal} disabled={savingCard}>Hủy</button>
              <button type="submit" form="flashcard-card-form" className={shared.primaryButton} disabled={savingCard}>
                {savingCard ? 'Đang lưu...' : 'Lưu flashcard'}
              </button>
            </>
          )}
        >
          <form id="flashcard-card-form" className={styles.form} onSubmit={saveCard}>
            <div className={styles.formGrid}>
              <label>
                Từ vựng *
                <input value={cardForm.term} onChange={(event) => updateCardForm('term', event.target.value)} required />
              </label>
              <label>
                Phiên âm
                <input value={cardForm.pronunciation} onChange={(event) => updateCardForm('pronunciation', event.target.value)} />
              </label>
              <label>
                Từ loại
                <input value={cardForm.wordType} onChange={(event) => updateCardForm('wordType', event.target.value)} />
              </label>
              <label>
                Thứ tự hiển thị
                <input type="number" value={cardForm.displayOrder} onChange={(event) => updateCardForm('displayOrder', event.target.value)} />
              </label>
            </div>
            <label className={styles.wideField}>
              Nghĩa tiếng Việt *
              <textarea rows="3" value={cardForm.meaning} onChange={(event) => updateCardForm('meaning', event.target.value)} required />
            </label>
            <label className={styles.wideField}>
              Câu ví dụ
              <textarea rows="3" value={cardForm.example} onChange={(event) => updateCardForm('example', event.target.value)} />
            </label>
          </form>
        </AdminModal>

        <AdminModal
          open={importModalOpen}
          title="Import flashcard từ Excel"
          description="Tải file mẫu, điền dữ liệu vào sheet 'Flashcards' rồi upload lại để thêm hàng loạt flashcard vào bộ này."
          onClose={closeImportModal}
          footer={(
            <>
              <button type="button" className={shared.secondaryButton} onClick={closeImportModal} disabled={importing}>Hủy</button>
              <button type="button" className={shared.primaryButton} onClick={submitImport} disabled={importing || !importFile}>
                {importing ? 'Đang import...' : 'Import'}
              </button>
            </>
          )}
        >
          <div className={styles.form}>
            <label className={styles.wideField}>
              File Excel *
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setImportFile(event.target.files?.[0] || null)}
              />
            </label>
            {importFile ? <p>Đã chọn: <strong>{importFile.name}</strong></p> : null}
          </div>
        </AdminModal>

        <AdminModal
          open={importErrors.length > 0}
          title="File Excel có dữ liệu không hợp lệ"
          description="Hãy sửa tất cả lỗi dưới đây rồi import lại. Không có flashcard nào được tạo từ lần import này."
          size="lg"
          onClose={() => { setImportErrors([]); setImportModalOpen(true); }}
          footer={(
            <button type="button" className={shared.primaryButton} onClick={() => { setImportErrors([]); setImportModalOpen(true); }}>
              Quay lại chọn file
            </button>
          )}
        >
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Dòng</th>
                  <th>Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {importErrors.map((item, index) => (
                  <tr key={`${item.row}-${index}`}>
                    <td>{item.row || '—'}</td>
                    <td>{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminModal>
      </div>
    );
  }

  return (
    <div className={shared.page}>
      <AdminPageHeader title="Quản lý flashcard" subtitle="Quản lý các bộ flashcard có sẵn hiển thị cho tất cả người dùng.">
        <button type="button" className={shared.secondaryButton} onClick={loadDecks} disabled={loadingDecks || savingDeck}>
          <RefreshIcon size={18} />
          Làm mới
        </button>
        <button type="button" className={shared.primaryButton} onClick={openDeckCreate} disabled={savingDeck}>
          <BookIcon size={18} />
          Thêm bộ flashcard
        </button>
      </AdminPageHeader>

      {deckError ? <div className={shared.errorBox}>{deckError}</div> : null}
      {deckSuccess ? <div className={shared.resultSummary}>{deckSuccess}</div> : null}

      <section className={shared.panel}>
        <div className={shared.resultSummary}>
          Có <strong>{decks.length}</strong> bộ flashcard. Bộ đang bật sẽ hiển thị cho mọi người dùng ở mục "Flashcard có sẵn".
        </div>
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Tên bộ</th>
                <th>Cấp độ</th>
                <th>Số thẻ</th>
                <th>Thứ tự</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loadingDecks ? (
                <tr><td colSpan={6} className={shared.emptyState}>Đang tải bộ flashcard...</td></tr>
              ) : decks.length === 0 ? (
                <tr><td colSpan={6} className={shared.emptyState}>Chưa có bộ flashcard nào.</td></tr>
              ) : (
                decks.map((deck) => (
                  <tr key={deck.id}>
                    <td className={styles.termCell}>{deck.name}</td>
                    <td>{deck.level || '-'}</td>
                    <td>{deck.cardCount}</td>
                    <td>{deck.displayOrder}</td>
                    <td>
                      <button
                        type="button"
                        className={deck.active ? styles.activePillButton : styles.inactivePillButton}
                        onClick={() => toggleDeckStatus(deck)}
                        disabled={savingDeck}
                        aria-label={deck.active ? 'Ẩn bộ flashcard' : 'Hiện bộ flashcard'}
                      >
                        {deck.active ? 'Đang hiện' : 'Đang ẩn'}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button type="button" onClick={() => openDeckCards(deck)} disabled={savingDeck}>Quản lý thẻ</button>
                        <button type="button" onClick={() => openDeckEdit(deck)} disabled={savingDeck}>Sửa</button>
                        <button type="button" className={styles.deleteButton} onClick={() => deleteDeck(deck)} disabled={savingDeck}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AdminModal
        open={deckModalOpen}
        title={editingDeck ? 'Chỉnh sửa bộ flashcard' : 'Thêm bộ flashcard'}
        onClose={closeDeckModal}
        footer={(
          <>
            <button type="button" className={shared.secondaryButton} onClick={closeDeckModal} disabled={savingDeck}>Hủy</button>
            <button type="submit" form="flashcard-deck-form" className={shared.primaryButton} disabled={savingDeck}>
              {savingDeck ? 'Đang lưu...' : 'Lưu bộ flashcard'}
            </button>
          </>
        )}
      >
        <form id="flashcard-deck-form" className={styles.form} onSubmit={saveDeck}>
          <label className={styles.wideField}>
            Tên bộ *
            <input value={deckForm.name} onChange={(event) => updateDeckForm('name', event.target.value)} placeholder="Ví dụ: Từ vựng IELTS - Môi trường" required />
          </label>
          <label className={styles.wideField}>
            Mô tả
            <textarea rows="2" value={deckForm.description} onChange={(event) => updateDeckForm('description', event.target.value)} />
          </label>
          <div className={styles.formGrid}>
            <label>
              Cấp độ
              <select value={deckForm.level} onChange={(event) => updateDeckForm('level', event.target.value)}>
                <option>Basic</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
            <label>
              Thứ tự hiển thị
              <input type="number" value={deckForm.displayOrder} onChange={(event) => updateDeckForm('displayOrder', event.target.value)} />
            </label>
            <label className={styles.switchField}>
              Hiển thị cho người dùng
              <input type="checkbox" checked={deckForm.active} onChange={(event) => updateDeckForm('active', event.target.checked)} />
            </label>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
