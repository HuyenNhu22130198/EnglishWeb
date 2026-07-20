import { useCallback, useEffect, useState } from 'react';
import { useConfirmDialog } from '../../contexts/useConfirmDialog';
import AdminModal from '../components/AdminModal';
import AdminPageHeader from '../components/AdminPageHeader';
import { FileTextIcon, RefreshIcon } from '../components/AdminIcons';
import shared from '../AdminShared.module.css';
import { adminBannerAPI } from './adminBannerService';
import styles from './AdminBanners.module.css';

const emptyForm = {
  imageUrl: '',
  title: '',
  linkUrl: '',
  displayOrder: 0,
  active: true,
};

export default function AdminBanners() {
  const confirm = useConfirmDialog();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingBanner, setEditingBanner] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const loadBanners = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setBanners(await adminBannerAPI.getBanners());
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách banner.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const openCreate = () => {
    setEditingBanner(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setPreviewUrl('');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (banner) => {
    setEditingBanner(banner);
    setForm({
      imageUrl: banner.imageUrl || '',
      title: banner.title || '',
      linkUrl: banner.linkUrl || '',
      displayOrder: banner.displayOrder ?? 0,
      active: Boolean(banner.active),
    });
    setSelectedFile(null);
    setPreviewUrl(banner.imageUrl || '');
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setEditingBanner(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setPreviewUrl('');
    setModalOpen(false);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : form.imageUrl || '');
  };

  const saveBanner = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      let imageUrl = form.imageUrl;
      if (selectedFile) {
        const uploadResponse = await adminBannerAPI.uploadBannerImage(selectedFile);
        imageUrl = uploadResponse?.imageUrl || '';
      }

      if (!imageUrl) {
        throw new Error('Vui lòng chọn ảnh banner để tải lên Cloudinary.');
      }

      const payload = {
        ...form,
        imageUrl,
        displayOrder: Number(form.displayOrder) || 0,
      };

      if (editingBanner?.id) {
        await adminBannerAPI.updateBanner(editingBanner.id, payload);
        setSuccess('Đã cập nhật banner.');
      } else {
        await adminBannerAPI.createBanner(payload);
        setSuccess('Đã thêm banner.');
      }

      closeModal();
      await loadBanners();
    } catch (err) {
      setError(err.message || 'Không thể lưu banner.');
    } finally {
      setSaving(false);
    }
  };

  const deleteBanner = async (banner) => {
    const confirmed = await confirm({
      title: 'Xóa banner?',
      message: `Banner "${banner.title || `#${banner.id}`}" sẽ bị xóa khỏi hệ thống.`,
      confirmLabel: 'Xóa banner',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await adminBannerAPI.deleteBanner(banner.id);
      setSuccess('Đã xóa banner.');
      await loadBanners();
    } catch (err) {
      setError(err.message || 'Không thể xóa banner.');
    } finally {
      setSaving(false);
    }
  };

  const toggleBannerStatus = async (banner) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await adminBannerAPI.updateBanner(banner.id, {
        imageUrl: banner.imageUrl,
        title: banner.title || '',
        linkUrl: banner.linkUrl || '',
        displayOrder: banner.displayOrder ?? 0,
        active: !banner.active,
      });

      setSuccess(banner.active ? 'Đã ẩn banner.' : 'Đã hiện banner.');
      await loadBanners();
    } catch (err) {
      setError(err.message || 'Không thể cập nhật trạng thái banner.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={shared.page}>
      <AdminPageHeader title="Quản lý banner">
        <button type="button" className={shared.secondaryButton} onClick={loadBanners} disabled={loading || saving}>
          <RefreshIcon size={18} />
          Làm mới
        </button>
        <button type="button" className={shared.primaryButton} onClick={openCreate} disabled={saving}>
          <FileTextIcon size={18} />
          Thêm banner
        </button>
      </AdminPageHeader>

      {error ? <div className={shared.errorBox}>{error}</div> : null}
      {success ? <div className={shared.resultSummary}>{success}</div> : null}

      <section className={shared.panel}>
        <div className={shared.resultSummary}>
          Có <strong>{banners.length}</strong> banner. Banner đang bật sẽ hiển thị trên trang chủ theo thứ tự tăng dần.
        </div>
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tiêu đề</th>
                <th>Điều hướng</th>
                <th>Thứ tự</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className={shared.emptyState}>Đang tải banner...</td></tr>
              ) : banners.length === 0 ? (
                <tr><td colSpan={6} className={shared.emptyState}>Chưa có banner nào.</td></tr>
              ) : (
                banners.map((banner) => (
                  <tr key={banner.id}>
                    <td><img className={styles.thumbnail} src={banner.imageUrl} alt={banner.title || 'Banner'} /></td>
                    <td className={styles.titleCell}>{banner.title || 'Không có tiêu đề'}</td>
                    <td className={styles.urlCell}>{banner.linkUrl || 'Không điều hướng'}</td>
                    <td>{banner.displayOrder}</td>
                    <td>
                      <button
                        type="button"
                        className={banner.active ? styles.activePillButton : styles.inactivePillButton}
                        onClick={() => toggleBannerStatus(banner)}
                        disabled={saving}
                        aria-label={banner.active ? 'Ẩn banner' : 'Hiện banner'}
                      >
                        {banner.active ? 'Đang hiện' : 'Đang ẩn'}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button type="button" onClick={() => openEdit(banner)} disabled={saving}>Sửa</button>
                        <button type="button" className={styles.deleteButton} onClick={() => deleteBanner(banner)} disabled={saving}>Xóa</button>
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
        open={modalOpen}
        title={editingBanner ? 'Chỉnh sửa banner' : 'Thêm banner'}
        onClose={closeModal}
        footer={(
          <>
            <button type="button" className={shared.secondaryButton} onClick={closeModal} disabled={saving}>Hủy</button>
            <button type="submit" form="banner-form" className={shared.primaryButton} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu banner'}
            </button>
          </>
        )}
      >
        <form id="banner-form" className={styles.form} onSubmit={saveBanner}>
          <label className={styles.wideField}>
            Ảnh banner
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>
          {previewUrl ? <img className={styles.preview} src={previewUrl} alt="Xem trước banner" /> : null}
          <div className={styles.formGrid}>
            <label>
              Tiêu đề
              <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Ví dụ: Ưu đãi tháng 6" />
            </label>
            <label>
              URL điều hướng
              <input value={form.linkUrl} onChange={(event) => updateForm('linkUrl', event.target.value)} placeholder="/exams/toeic hoặc https://..." />
            </label>
            <label>
              Thứ tự hiển thị
              <input type="number" value={form.displayOrder} onChange={(event) => updateForm('displayOrder', event.target.value)} />
            </label>
            <label className={styles.switchField}>
              Hiển thị trên trang chủ
              <input type="checkbox" checked={form.active} onChange={(event) => updateForm('active', event.target.checked)} />
            </label>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
