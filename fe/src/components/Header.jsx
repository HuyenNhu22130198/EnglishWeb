import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './Header.module.css';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, user, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExamDropdownOpen, setIsExamDropdownOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  const isExamPage =
    location.pathname.startsWith('/exams') ||
    location.pathname.startsWith('/practice');

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();

    const keyword = searchKeyword.trim();

    if (!keyword) return;

    navigate(`/dictionary?keyword=${encodeURIComponent(keyword)}`);
    setSearchKeyword('');
  };

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className={styles.headerWrapper}>
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logo} onClick={closeMobileMenu}>
          <span className={styles.logoIcon}>N</span>
          <span className={styles.logoText}>StudyEnglishWithNhu</span>
        </Link>

        <div className={styles.desktopMenu}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.activeLink : ''}`
            }
          >
            Trang chủ
          </NavLink>

          <NavLink
            to="/dictionary"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.activeLink : ''}`
            }
          >
            Từ điển
          </NavLink>

          <div
            className={styles.dropdown}
            onMouseEnter={() => setIsExamDropdownOpen(true)}
            onMouseLeave={() => setIsExamDropdownOpen(false)}
          >
            <button
              type="button"
              className={`${styles.navLink} ${styles.dropdownTrigger} ${
                isExamPage ? styles.activeLink : ''
              }`}
              onClick={() => setIsExamDropdownOpen(!isExamDropdownOpen)}
            >
              Kho đề
            </button>

            {isExamDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <NavLink to="/exams/toeic">Kho đề TOEIC</NavLink>
                <NavLink to="/exams/ielts">Kho đề IELTS</NavLink>
              </div>
            )}
          </div>

          {isAuthenticated && (
            <NavLink
              to="/infor"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.activeLink : ''}`
              }
            >
              Trang cá nhân
            </NavLink>
          )}
        </div>

        <form className={styles.searchBox} onSubmit={handleSearch}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm từ vựng..."
          />
        </form>

        <div className={styles.desktopActions}>
          {isAuthenticated ? (
            <>
              <Link to="/infor" className={styles.userChip}>
                <span className={styles.userAvatar}>
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
                <span className={styles.userName}>{user?.fullName}</span>
              </Link>

              <button className={styles.btnLogout} onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.btnLogin}>
                Đăng nhập
              </Link>

              <Link to="/register" className={styles.btnRegister}>
                Đăng ký
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className={styles.mobileMenuBtn}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Mở menu"
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {isMenuOpen && (
        <div className={styles.mobileMenu}>
          <NavLink to="/" onClick={closeMobileMenu}>
            Trang chủ
          </NavLink>

          <NavLink to="/dictionary" onClick={closeMobileMenu}>
            Từ điển
          </NavLink>

          <NavLink to="/exams/toeic" onClick={closeMobileMenu}>
            Kho đề TOEIC
          </NavLink>

          <NavLink to="/exams/ielts" onClick={closeMobileMenu}>
            Kho đề IELTS
          </NavLink>

          {isAuthenticated && (
            <NavLink to="/infor" onClick={closeMobileMenu}>
              Trang cá nhân
            </NavLink>
          )}

          <form className={styles.mobileSearchBox} onSubmit={handleSearch}>
            <span className={styles.searchIcon}>⌕</span>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm từ vựng..."
            />
          </form>

          <div className={styles.mobileActions}>
            {isAuthenticated ? (
              <button className={styles.btnLogout} onClick={handleLogout}>
                Đăng xuất
              </button>
            ) : (
              <>
                <Link to="/login" className={styles.btnLogin} onClick={closeMobileMenu}>
                  Đăng nhập
                </Link>

                <Link to="/register" className={styles.btnRegister} onClick={closeMobileMenu}>
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
