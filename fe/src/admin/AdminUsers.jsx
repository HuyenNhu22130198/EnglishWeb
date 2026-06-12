import { useEffect, useMemo, useState } from "react";
import { adminUserService } from "./services/adminUserService";
import AdminModal from "./components/AdminModal";
import AdminPageHeader from "./components/AdminPageHeader";
import Pagination from "./components/Pagination";
import {
  CheckCircleIcon,
  DownloadIcon,
  EditIcon,
  LockIcon,
  RefreshIcon,
  SearchIcon,
  ShieldIcon,
  UnlockIcon,
  UsersIcon,
} from "./components/AdminIcons";
import shared from "./AdminShared.module.css";
import styles from "./AdminUsers.module.css";

const PAGE_SIZE_OPTIONS = [5, 10, 20];

function getCurrentUserId() {
  const rawUser = localStorage.getItem("user");

  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser)?.id ?? null;
  } catch {
    return null;
  }
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getInitials(name) {
  if (!name) return "U";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getDateValue(value) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [verificationFilter, setVerificationFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const [roleUser, setRoleUser] = useState(null);
  const [roleDraft, setRoleDraft] = useState("USER");
  const [statusUser, setStatusUser] = useState(null);

  const [toast, setToast] = useState(null);

  const currentUserId = getCurrentUserId();

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  async function fetchUsers(showSuccess = false) {
    try {
      setLoading(true);
      setError("");

      const data = await adminUserService.getAllUsers();
      setUsers(Array.isArray(data) ? data : []);

      if (showSuccess) {
        showToast("Đã cập nhật danh sách người dùng.");
      }
    } catch (err) {
      setError(err.message || "Không thể tải danh sách người dùng");
      showToast(err.message || "Không thể tải danh sách người dùng", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    keyword,
    roleFilter,
    statusFilter,
    verificationFilter,
    sortBy,
    pageSize,
  ]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.status === "ACTIVE").length,
      admin: users.filter((user) => user.role === "ADMIN").length,
      locked: users.filter((user) => user.status !== "ACTIVE").length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const search = normalizeText(keyword);

    const result = users.filter((user) => {
      const matchesSearch =
        !search ||
        normalizeText(user.fullName).includes(search) ||
        normalizeText(user.username).includes(search) ||
        normalizeText(user.email).includes(search);

      const matchesRole =
        roleFilter === "ALL" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.status === "ACTIVE") ||
        (statusFilter === "LOCKED" && user.status !== "ACTIVE");

      const matchesVerification =
        verificationFilter === "ALL" ||
        (verificationFilter === "VERIFIED" && user.emailVerified) ||
        (verificationFilter === "UNVERIFIED" && !user.emailVerified);

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesVerification
      );
    });

    return [...result].sort((first, second) => {
      switch (sortBy) {
        case "OLDEST":
          return getDateValue(first.createdAt) - getDateValue(second.createdAt);

        case "NAME_ASC":
          return String(first.fullName || "").localeCompare(
            String(second.fullName || ""),
            "vi"
          );

        case "NAME_DESC":
          return String(second.fullName || "").localeCompare(
            String(first.fullName || ""),
            "vi"
          );

        case "EMAIL_ASC":
          return String(first.email || "").localeCompare(
            String(second.email || "")
          );

        case "NEWEST":
        default:
          return getDateValue(second.createdAt) - getDateValue(first.createdAt);
      }
    });
  }, [
    users,
    keyword,
    roleFilter,
    statusFilter,
    verificationFilter,
    sortBy,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / pageSize)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(
    startIndex + pageSize,
    filteredUsers.length
  );

  const displayedUsers = filteredUsers.slice(startIndex, endIndex);

  function openRoleModal(user) {
    if (user.id === currentUserId) {
      showToast(
        "Không thể thay đổi quyền của tài khoản đang đăng nhập.",
        "error"
      );
      return;
    }

    setRoleUser(user);
    setRoleDraft(user.role);
  }

  async function submitRoleChange() {
    if (!roleUser || roleDraft === roleUser.role) {
      setRoleUser(null);
      return;
    }

    try {
      setProcessing(true);

      const updatedUser = await adminUserService.updateUserRole(
        roleUser.id,
        roleDraft
      );

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updatedUser.id ? updatedUser : user
        )
      );

      setRoleUser(null);
      showToast("Đã cập nhật quyền người dùng.");
    } catch (err) {
      showToast(err.message || "Không thể cập nhật quyền.", "error");
    } finally {
      setProcessing(false);
    }
  }

  function openStatusModal(user) {
    if (user.id === currentUserId) {
      showToast(
        "Không thể khóa tài khoản admin đang đăng nhập.",
        "error"
      );
      return;
    }

    setStatusUser(user);
  }

  async function submitStatusChange() {
    if (!statusUser) return;

    const isActive = statusUser.status === "ACTIVE";

    try {
      setProcessing(true);

      const updatedUser = isActive
        ? await adminUserService.disableUser(statusUser.id)
        : await adminUserService.enableUser(statusUser.id);

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updatedUser.id ? updatedUser : user
        )
      );

      setStatusUser(null);

      showToast(
        isActive
          ? "Đã khóa tài khoản người dùng."
          : "Đã mở khóa tài khoản người dùng."
      );
    } catch (err) {
      showToast(
        err.message || "Không thể cập nhật trạng thái tài khoản.",
        "error"
      );
    } finally {
      setProcessing(false);
    }
  }

  function exportCsv() {
    const headers = [
      "ID",
      "Họ tên",
      "Username",
      "Email",
      "Quyền",
      "Trạng thái",
      "Xác thực email",
      "Ngày tạo",
    ];

    const rows = filteredUsers.map((user) => [
      user.id,
      user.fullName,
      user.username,
      user.email,
      user.role,
      user.status,
      user.emailVerified ? "Đã xác thực" : "Chưa xác thực",
      user.createdAt || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "danh-sach-nguoi-dung.csv";
    link.click();

    URL.revokeObjectURL(url);
    showToast("Đã xuất báo cáo người dùng.");
  }

  return (
    <div className={shared.page}>
      <AdminPageHeader
        title="Quản lý người dùng"
        subtitle="Theo dõi thành viên, phân quyền tài khoản và kiểm soát trạng thái hoạt động trong hệ thống."
      >
        <button
          type="button"
          className={shared.secondaryButton}
          onClick={() => fetchUsers(true)}
          disabled={loading}
        >
          <RefreshIcon size={18} />
          Làm mới
        </button>

        <button
          type="button"
          className={shared.primaryButton}
          onClick={exportCsv}
          disabled={filteredUsers.length === 0}
        >
          <DownloadIcon size={18} />
          Xuất báo cáo
        </button>
      </AdminPageHeader>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.blueIcon}`}>
            <UsersIcon size={23} />
          </div>

          <div className={styles.statContent}>
            <span className={styles.statLabel}>Tổng người dùng</span>
            <strong className={styles.statValue}>{stats.total}</strong>
            <span className={styles.statHint}>Tất cả tài khoản hệ thống</span>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.greenIcon}`}>
            <CheckCircleIcon size={23} />
          </div>

          <div className={styles.statContent}>
            <span className={styles.statLabel}>Đang hoạt động</span>
            <strong className={styles.statValue}>{stats.active}</strong>
            <span className={styles.statHint}>Có thể truy cập hệ thống</span>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.orangeIcon}`}>
            <ShieldIcon size={23} />
          </div>

          <div className={styles.statContent}>
            <span className={styles.statLabel}>Quản trị viên</span>
            <strong className={styles.statValue}>{stats.admin}</strong>
            <span className={styles.statHint}>Tài khoản có quyền admin</span>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.redIcon}`}>
            <LockIcon size={23} />
          </div>

          <div className={styles.statContent}>
            <span className={styles.statLabel}>Đã khóa</span>
            <strong className={styles.statValue}>{stats.locked}</strong>
            <span className={styles.statHint}>Không thể đăng nhập</span>
          </div>
        </article>
      </section>

      <section className={shared.panel}>
        <div className={shared.toolbar}>
          <div className={shared.searchWrap}>
            <span className={shared.searchIcon}>
              <SearchIcon size={19} />
            </span>

            <input
              className={shared.searchInput}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên, username hoặc email..."
            />
          </div>

          <div className={styles.filterGroup}>
            <select
              className={shared.select}
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              aria-label="Lọc theo quyền"
            >
              <option value="ALL">Tất cả quyền</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
            </select>

            <select
              className={shared.select}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Lọc theo trạng thái"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
            </select>

            <select
              className={shared.select}
              value={verificationFilter}
              onChange={(event) =>
                setVerificationFilter(event.target.value)
              }
              aria-label="Lọc theo xác thực email"
            >
              <option value="ALL">Tất cả xác thực</option>
              <option value="VERIFIED">Đã xác thực</option>
              <option value="UNVERIFIED">Chưa xác thực</option>
            </select>

            <select
              className={shared.select}
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sắp xếp người dùng"
            >
              <option value="NEWEST">Mới nhất</option>
              <option value="OLDEST">Cũ nhất</option>
              <option value="NAME_ASC">Tên A → Z</option>
              <option value="NAME_DESC">Tên Z → A</option>
              <option value="EMAIL_ASC">Email A → Z</option>
            </select>
          </div>
        </div>

        <div className={shared.resultSummary}>
          Hiển thị <strong>{filteredUsers.length}</strong> trên tổng số{" "}
          <strong>{users.length}</strong> người dùng
        </div>

        {error && <div className={shared.errorBox}>{error}</div>}

        {loading ? (
          <div className={shared.emptyState}>
            Đang tải danh sách người dùng...
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className={shared.emptyState}>
            Không tìm thấy người dùng phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Xác thực email</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {displayedUsers.map((user) => {
                  const isActive = user.status === "ACTIVE";
                  const isCurrentUser = user.id === currentUserId;

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar}>
                            {getInitials(user.fullName)}
                          </div>

                          <div className={styles.userInfo}>
                            <div className={styles.userNameLine}>
                              <strong>
                                {user.fullName || "Chưa cập nhật tên"}
                              </strong>

                              {isCurrentUser && (
                                <span className={styles.currentUserLabel}>
                                  Bạn
                                </span>
                              )}
                            </div>

                            <span>@{user.username || "unknown"}</span>
                          </div>
                        </div>
                      </td>

                      <td className={styles.emailCell}>{user.email}</td>

                      <td>
                        <span
                          className={`${styles.roleBadge} ${
                            user.role === "ADMIN"
                              ? styles.adminRole
                              : styles.userRole
                          }`}
                        >
                          {user.role === "ADMIN" ? "Admin" : "User"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            isActive
                              ? styles.activeStatus
                              : styles.lockedStatus
                          }`}
                        >
                          <span className={styles.statusDot} />
                          {isActive ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`${styles.verifyBadge} ${
                            user.emailVerified
                              ? styles.verified
                              : styles.unverified
                          }`}
                        >
                          {user.emailVerified
                            ? "Đã xác thực"
                            : "Chưa xác thực"}
                        </span>
                      </td>

                      <td>{formatDate(user.createdAt)}</td>

                      <td>
                        <div className={styles.actionGroup}>
                          <button
                            type="button"
                            className={`${styles.actionButton} ${styles.editAction}`}
                            onClick={() => openRoleModal(user)}
                            disabled={isCurrentUser}
                            title={
                              isCurrentUser
                                ? "Không thể tự thay đổi quyền"
                                : "Chỉnh sửa quyền"
                            }
                            aria-label="Chỉnh sửa quyền"
                          >
                            <EditIcon size={17} />
                          </button>

                          <button
                            type="button"
                            className={`${styles.actionButton} ${
                              isActive
                                ? styles.lockAction
                                : styles.unlockAction
                            }`}
                            onClick={() => openStatusModal(user)}
                            disabled={isCurrentUser}
                            title={
                              isCurrentUser
                                ? "Không thể khóa tài khoản hiện tại"
                                : isActive
                                  ? "Khóa tài khoản"
                                  : "Mở khóa tài khoản"
                            }
                            aria-label={
                              isActive
                                ? "Khóa tài khoản"
                                : "Mở khóa tài khoản"
                            }
                          >
                            {isActive ? (
                              <LockIcon size={17} />
                            ) : (
                              <UnlockIcon size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredUsers.length > 0 && (
          <div className={shared.panelFooter}>
            <div className={styles.pageSizeGroup}>
              <span>Hiển thị</span>

              <select
                className={styles.pageSizeSelect}
                value={pageSize}
                onChange={(event) =>
                  setPageSize(Number(event.target.value))
                }
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option value={size} key={size}>
                    {size}
                  </option>
                ))}
              </select>

              <span>dòng mỗi trang</span>
            </div>

            <div className={shared.footerInfo}>
              Hiển thị{" "}
              <strong>
                {filteredUsers.length === 0 ? 0 : startIndex + 1}
              </strong>
              –<strong>{endIndex}</strong> trên{" "}
              <strong>{filteredUsers.length}</strong>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </section>

      <AdminModal
        open={Boolean(roleUser)}
        title="Thay đổi quyền người dùng"
        description={
          roleUser
            ? `Cập nhật quyền truy cập cho ${roleUser.fullName}.`
            : ""
        }
        onClose={() => {
          if (!processing) setRoleUser(null);
        }}
        footer={
          <>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => setRoleUser(null)}
              disabled={processing}
            >
              Hủy
            </button>

            <button
              type="button"
              className={shared.primaryButton}
              onClick={submitRoleChange}
              disabled={
                processing ||
                !roleUser ||
                roleDraft === roleUser?.role
              }
            >
              {processing ? "Đang cập nhật..." : "Lưu thay đổi"}
            </button>
          </>
        }
      >
        <div className={styles.modalField}>
          <label htmlFor="admin-role-select">Quyền tài khoản</label>

          <select
            id="admin-role-select"
            className={styles.modalSelect}
            value={roleDraft}
            onChange={(event) => setRoleDraft(event.target.value)}
          >
            <option value="USER">USER — Người dùng</option>
            <option value="ADMIN">ADMIN — Quản trị viên</option>
          </select>

          <p>
            Tài khoản ADMIN có thể truy cập và thay đổi dữ liệu trong khu vực
            quản trị.
          </p>
        </div>
      </AdminModal>

      <AdminModal
        open={Boolean(statusUser)}
        title={
          statusUser?.status === "ACTIVE"
            ? "Khóa tài khoản"
            : "Mở khóa tài khoản"
        }
        description={
          statusUser
            ? `Bạn đang thay đổi trạng thái tài khoản của ${statusUser.fullName}.`
            : ""
        }
        onClose={() => {
          if (!processing) setStatusUser(null);
        }}
        footer={
          <>
            <button
              type="button"
              className={shared.secondaryButton}
              onClick={() => setStatusUser(null)}
              disabled={processing}
            >
              Hủy
            </button>

            <button
              type="button"
              className={
                statusUser?.status === "ACTIVE"
                  ? shared.dangerButton
                  : shared.primaryButton
              }
              onClick={submitStatusChange}
              disabled={processing}
            >
              {processing
                ? "Đang xử lý..."
                : statusUser?.status === "ACTIVE"
                  ? "Xác nhận khóa"
                  : "Xác nhận mở khóa"}
            </button>
          </>
        }
      >
        <div
          className={`${styles.confirmBox} ${
            statusUser?.status === "ACTIVE"
              ? styles.confirmDanger
              : styles.confirmSuccess
          }`}
        >
          {statusUser?.status === "ACTIVE" ? (
            <>
              <LockIcon size={22} />
              <p>
                Người dùng sẽ không thể đăng nhập và sử dụng tài khoản sau khi
                bị khóa.
              </p>
            </>
          ) : (
            <>
              <UnlockIcon size={22} />
              <p>
                Người dùng sẽ có thể đăng nhập và tiếp tục sử dụng hệ thống.
              </p>
            </>
          )}
        </div>
      </AdminModal>

      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === "error"
              ? styles.toastError
              : styles.toastSuccess
          }`}
        >
          {toast.type === "error" ? (
            <LockIcon size={19} />
          ) : (
            <CheckCircleIcon size={19} />
          )}

          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}