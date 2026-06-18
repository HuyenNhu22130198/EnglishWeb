import AdminPageHeader from "./components/AdminPageHeader";
import {
  FileTextIcon,
  RefreshIcon,
  SearchIcon,
} from "./components/AdminIcons";
import shared from "./AdminShared.module.css";

export default function AdminEmptyPage() {
  return (
    <div className={shared.page}>
      <AdminPageHeader
        title="Quản lý đề thi"
        subtitle="Theo dõi và quản lý các bộ đề TOEIC, IELTS cùng dữ liệu câu hỏi trong hệ thống."
      >
        <button
          type="button"
          className={shared.secondaryButton}
        >
          <RefreshIcon size={18} />
          Làm mới
        </button>

        <button
          type="button"
          className={shared.primaryButton}
        >
          <FileTextIcon size={18} />
          Thêm đề thi
        </button>
      </AdminPageHeader>

      <section className={shared.panel}>
        <div className={shared.toolbar}>
          <div className={shared.searchWrap}>
            <span className={shared.searchIcon}>
              <SearchIcon size={19} />
            </span>

            <input
              className={shared.searchInput}
              placeholder="Tìm theo tên hoặc mã đề thi..."
            />
          </div>

          <select className={shared.select} defaultValue="ALL">
            <option value="ALL">Tất cả loại đề</option>
            <option value="TOEIC">TOEIC</option>
            <option value="IELTS">IELTS</option>
          </select>

          <select className={shared.select} defaultValue="ALL">
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang sử dụng</option>
            <option value="HIDDEN">Đã ẩn</option>
          </select>
        </div>

        <div className={shared.emptyState}>
          Chưa có chức năng quản lý đề thi. Giao diện đã được chuẩn bị để tích
          hợp dữ liệu sau.
        </div>
      </section>
    </div>
  );
}