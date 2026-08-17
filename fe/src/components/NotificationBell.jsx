import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../services/notificationService';
import styles from './NotificationBell.module.css';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return date.toLocaleDateString('vi-VN');
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const response = await notificationAPI.getUnreadCount();
        setUnreadCount(response.data.count);
      } catch {
        // silent: notification bell is non-critical
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openDropdown = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const response = await notificationAPI.getNotifications(20);
        setNotifications(response.data);
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClickNotification = async (notification) => {
    if (!notification.read) {
      try {
        await notificationAPI.markAsRead(notification.id);
        setUnreadCount((current) => Math.max(0, current - 1));
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
        );
      } catch {
        // ignore
      }
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setUnreadCount(0);
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    } catch {
      // ignore
    }
  };

  return (
    <div ref={containerRef} className={styles.wrap}>
      <button type="button" onClick={openDropdown} aria-label="Thông báo" className={styles.bellBtn}>
        🔔
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <strong>Thông báo</strong>
            <button type="button" onClick={handleMarkAllAsRead} className={styles.markAllBtn}>
              Đánh dấu đã đọc hết
            </button>
          </div>

          {loading ? (
            <div className={styles.state}>Đang tải...</div>
          ) : notifications.length === 0 ? (
            <div className={styles.state}>Chưa có thông báo nào.</div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleClickNotification(notification)}
                className={`${styles.item} ${notification.read ? '' : styles.itemUnread}`}
              >
                <div>{notification.message}</div>
                <div className={styles.itemTime}>{formatDate(notification.createdAt)}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
