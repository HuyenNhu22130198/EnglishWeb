import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import styles from './AdminLayout.module.css';

const getCurrentUser = () => {
  try {
    const rawUser = localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
};

const AdminLayout = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span>N</span>
          <div>
            <strong>Admin Panel</strong>
            <small>StudyEnglishWithNhu</small>
          </div>
        </div>

        <nav className={styles.nav}>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
            }
          >
            Quản lý người dùng
          </NavLink>

          <NavLink
            to="/admin/dictionary"
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
            }
          >
            Quản lý từ vựng
          </NavLink>

          <NavLink
            to="/admin/toeic-exams"
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
            }
          >
            Quản lý đề thi
          </NavLink>
        </nav>
      </aside>

      <section className={styles.mainArea}>
        <header className={styles.topbar}>
          <div>
            <p>Xin chào,</p>
            <strong>{user?.fullName || user?.email || 'Admin'}</strong>
          </div>

          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </header>

        <div className={styles.content}>
          <Outlet />
        </div>
      </section>
    </div>
  );
};

export default AdminLayout;