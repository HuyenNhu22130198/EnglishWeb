import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/authService';
import { toeicAPI } from '../services/toeicService';
import styles from './Infor.module.css';

const formatDateTime = (value) => {
  if (!value) {
    return 'Chưa có thời gian';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

const Infor = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => authAPI.getStoredUser());
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const [userResponse, historyResponse] = await Promise.all([
          authAPI.getCurrentUser(),
          toeicAPI.getMyToeicHistory(),
        ]);

        if (userResponse?.success && userResponse.data) {
          setProfile(userResponse.data);
        } else {
          setProfile(authAPI.getStoredUser());
        }

        if (historyResponse.success) {
          setHistory(historyResponse.data || []);
        } else {
          setHistory([]);
          setError(historyResponse.message || 'Không thể tải lịch sử làm bài');
        }
      } catch (err) {
        setError(err.message || 'Lỗi kết nối đến server');
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const stats = useMemo(() => {
    const attempts = history.length;
    const totalScore = history.reduce((sum, item) => sum + (item.totalScore || 0), 0);
    const bestScore = history.reduce((max, item) => Math.max(max, item.totalScore || 0), 0);
    const averageScore = attempts > 0 ? Math.round(totalScore / attempts) : 0;
    const latestAttempt = history[0] || null;

    return {
      attempts,
      averageScore,
      bestScore,
      latestAttempt,
    };
  }, [history]);

  const avatarLetter = (profile?.fullName || profile?.email || 'U').trim().charAt(0).toUpperCase();

  return (
    <main className={styles.inforPage}>
      <div className={styles.pageBackdrop} />

      <div className="container" style={{ paddingTop: '100px', paddingBottom: '80px' }}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Trang cá nhân</span>
          <h1>Hồ sơ học tập của bạn</h1>
          <p>Quản lý thông tin cá nhân và theo dõi toàn bộ lịch sử làm bài TOEIC.</p>
        </div>

        <div className={styles.content}>
          <section className={styles.profileCard}>
            <div className={styles.avatarSection}>
              <div className={styles.avatar}>
                <span>{avatarLetter}</span>
              </div>

              <div>
                <h2>{profile?.fullName || 'Người dùng'}</h2>
                <p>
                  {profile?.role ? `Vai trò: ${profile.role}` : 'Tài khoản học viên'}
                  {profile?.email ? ` • ${profile.email}` : ''}
                </p>
              </div>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <strong>Họ và tên</strong>
                <span>{profile?.fullName || 'Chưa cập nhật'}</span>
              </div>
              <div className={styles.infoItem}>
                <strong>Email</strong>
                <span>{profile?.email || 'Chưa cập nhật'}</span>
              </div>
              <div className={styles.infoItem}>
                <strong>Username</strong>
                <span>{profile?.username || 'Chưa cập nhật'}</span>
              </div>
              <div className={styles.infoItem}>
                <strong>Ngày tham gia</strong>
                <span>{profile?.createdAt ? formatDateTime(profile.createdAt) : 'Chưa có dữ liệu'}</span>
              </div>
            </div>

            <button className={styles.editButton} type="button">
              Chỉnh sửa thông tin
            </button>
          </section>

          <section className={styles.progressSection}>
            <h3>Tổng quan học tập</h3>

            <div className={styles.progressCards}>
              <article className={styles.progressCard}>
                <div className={styles.progressTitle}>Số bài đã làm</div>
                <div className={styles.progressValue}>{formatNumber(stats.attempts)}</div>
                <div className={styles.progressText}>Lượt nộp bài TOEIC đã được lưu</div>
              </article>

              <article className={styles.progressCard}>
                <div className={styles.progressTitle}>Điểm trung bình</div>
                <div className={styles.progressValue}>{formatNumber(stats.averageScore)}</div>
                <div className={styles.progressText}>Tính trên toàn bộ lịch sử làm bài</div>
              </article>

              <article className={styles.progressCard}>
                <div className={styles.progressTitle}>Điểm cao nhất</div>
                <div className={styles.progressValue}>{formatNumber(stats.bestScore)}</div>
                <div className={styles.progressText}>
                  {stats.latestAttempt
                    ? `Bài gần nhất: ${stats.latestAttempt.examCode || 'TOEIC'}`
                    : 'Chưa có bài làm nào'}
                </div>
              </article>
            </div>
          </section>

          <section className={styles.historySection}>
            <div className={styles.sectionHeaderRow}>
              <div>
                <h3>Lịch sử làm bài TOEIC</h3>
                <p>
                  Mỗi bài làm được lưu theo <code>attemptId</code>, có thể mở lại phần kết quả chi tiết bất kỳ lúc nào.
                </p>
              </div>
            </div>

            {loading ? (
              <div className={styles.historyState}>
                <h4>Đang tải lịch sử...</h4>
                <p>Vui lòng chờ trong giây lát.</p>
              </div>
            ) : error ? (
              <div className={styles.historyState}>
                <h4>Không thể tải lịch sử</h4>
                <p>{error}</p>
                <button type="button" className={styles.retryButton} onClick={() => window.location.reload()}>
                  Thử lại
                </button>
              </div>
            ) : history.length === 0 ? (
              <div className={styles.historyState}>
                <h4>Chưa có lịch sử làm bài</h4>
                <p>Hãy làm một bài TOEIC và nộp bài để hệ thống lưu kết quả vào trang cá nhân.</p>
              </div>
            ) : (
              <div className={styles.historyList}>
                {history.map((item) => (
                  <article key={item.attemptId} className={styles.historyCard}>
                    <div className={styles.historyTopRow}>
                      <div>
                        <div className={styles.historyExamCode}>#{item.examCode || `ATT-${item.attemptId}`}</div>
                        <h4>{item.examName || 'Bài thi TOEIC'}</h4>
                      </div>

                      <div className={styles.scoreBadge}>
                        <span>Score</span>
                        <strong>{formatNumber(item.totalScore)}</strong>
                      </div>
                    </div>

                    <div className={styles.historyMetaGrid}>
                      <div>
                        <strong>Đúng</strong>
                        <span>{formatNumber(item.correctCount)}</span>
                      </div>
                      <div>
                        <strong>Đã làm</strong>
                        <span>
                          {formatNumber(item.answeredCount)}/{formatNumber(item.totalQuestions)}
                        </span>
                      </div>
                      <div>
                        <strong>Listening</strong>
                        <span>{formatNumber(item.listeningScore)}</span>
                      </div>
                      <div>
                        <strong>Reading</strong>
                        <span>{formatNumber(item.readingScore)}</span>
                      </div>
                    </div>

                    <div className={styles.historyFooter}>
                      <div className={styles.historyDate}>{formatDateTime(item.submittedAt)}</div>

                      <button
                        type="button"
                        className={styles.detailButton}
                        onClick={() => navigate(`/practice/toeic/result/${item.attemptId}`)}
                      >
                        Xem chi tiết
                      </button>
                    </div>

                    {item.partSummaries?.length > 0 && (
                      <div className={styles.partSummaryWrap}>
                        {item.partSummaries.map((part) => (
                          <div key={`${item.attemptId}-part-${part.partNo}`} className={styles.partSummaryChip}>
                            PART {part.partNo}: {part.correctCount}/{part.totalQuestions}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default Infor;
