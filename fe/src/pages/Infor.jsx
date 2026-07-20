import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/authService';
import { ieltsAPI } from '../services/ieltsService';
import { toeicAPI } from '../services/toeicService';
import styles from './Infor.module.css';

const sidebarItems = [
  {
    id: 'profile',
    label: 'Thông tin cá nhân',
    icon: 'user',
  },
  {
    id: 'history',
    label: 'Lịch sử làm bài',
    icon: 'history',
  },
  {
    id: 'stats',
    label: 'Thống kê kết quả',
    icon: 'chart',
  },
  {
    id: 'settings',
    label: 'Cài đặt tài khoản',
    icon: 'settings',
  },
];

const createProfileForm = (profile) => ({
  fullName: profile?.fullName || '',
  username: profile?.username || '',
  email: profile?.email || '',
  phoneNumber: profile?.phoneNumber || '',
  birthDate: profile?.birthDate || '',
  gender: profile?.gender || '',
  learningGoal: profile?.learningGoal || '',
  targetExamType: profile?.targetExamType || (profile?.targetBandScore ? 'IELTS' : 'TOEIC'),
  targetScore: profile?.targetScore ? String(profile.targetScore) : '',
  targetBandScore: profile?.targetBandScore ? String(profile.targetBandScore) : '',
  currentLevel: profile?.currentLevel || '',
});

const createSettingsForm = (profile) => ({
  publicProfileVisible: Boolean(profile?.publicProfileVisible),
  notifyForumReplies: profile?.notifyForumReplies !== false,
  notifyForumMentions: profile?.notifyForumMentions !== false,
  notifySystemUpdates: profile?.notifySystemUpdates !== false,
});

const toeicScoreOptions = [450, 550, 650, 750, 850, 900, 950, 990];
const ieltsBandOptions = ['4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'];

const formatDateTime = (value) => {
  if (!value) {
    return 'Chưa có dữ liệu';
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

const formatBand = (value) => {
  const band = Number(value);
  return Number.isFinite(band) ? band.toFixed(1) : '0.0';
};

const formatSimilarity = (value) => {
  const percent = Number(value);
  return Number.isFinite(percent) ? `${percent.toFixed(2)}%` : '0.00%';
};

const formatDuration = (seconds) => {
  const totalSeconds = Number(seconds);

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }

  if (minutes > 0) {
    return `${minutes} phút ${remainingSeconds} giây`;
  }

  return `${remainingSeconds} giây`;
};

const getSkillLabel = (skill) => {
  if (skill === 'WRITING') return 'Writing';
  if (skill === 'SPEAKING') return 'Speaking';
  return skill === 'READING' ? 'Reading' : 'Listening';
};

const Icon = ({ name }) => {
  const commonProps = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  if (name === 'history') {
    return (
      <svg {...commonProps}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === 'chart') {
    return (
      <svg {...commonProps}>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-8" />
        <path d="M22 19H2" />
      </svg>
    );
  }

  if (name === 'settings') {
    return (
      <svg {...commonProps}>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.97 19.35a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06A2 2 0 1 1 7.08 4.2l.06.06a1.7 1.7 0 0 0 1.88.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06A2 2 0 1 1 19.8 7.08l-.06.06a1.7 1.7 0 0 0-.34 1.88v-.02a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
};

const HistoryCardList = ({ groups, examType, expandedExamKey, onToggle, onOpenResult }) => {
  const isIelts = examType === 'IELTS';

  return (
    <div className={styles.historyList}>
      {groups.map((group) => {
        const isExpanded = expandedExamKey === group.examKey;
        const hasMultipleAttempts = group.attempts.length > 1;
        const isWriting = isIelts && group.skill === 'WRITING';
        const isSpeaking = isIelts && group.skill === 'SPEAKING';

        return (
          <article key={group.examKey} className={styles.historyCard}>
            <div className={styles.historySummary}>
              <div className={styles.historyMainInfo}>
                <span>{group.examCode || examType}</span>
                <h3>{group.examName}</h3>
                <p>
                  {isIelts && `${getSkillLabel(group.skill)} • `}
                  Làm {formatNumber(group.attempts.length)} lần • Gần nhất {formatDateTime(group.latestAttempt?.submittedAt)}
                </p>
                {isWriting && (
                  <p>
                    {formatNumber(group.latestAttempt?.totalWordCount)} từ · Task 1 {formatNumber(group.latestAttempt?.task1WordCount)} từ · Task 2 {formatNumber(group.latestAttempt?.task2WordCount)} từ
                  </p>
                )}
                {isSpeaking && (
                  <p>
                    {formatNumber(group.latestAttempt?.practicedSampleCount)}/{formatNumber(group.latestAttempt?.totalSampleCount)} mẫu đã luyện
                  </p>
                )}
              </div>

              {isSpeaking ? (
                <div className={styles.historyMetrics}>
                  <div><span>{group.bestAttempt?.assessmentSource === 'BROWSER' ? 'Độ khớp khi đọc cao nhất' : 'Phát âm cao nhất'}</span><strong>{Number(group.bestAttempt?.assessmentSource === 'BROWSER' ? group.bestAttempt?.averageReadingMatchScore : group.bestAttempt?.averagePronunciationScore || 0).toFixed(group.bestAttempt?.assessmentSource === 'BROWSER' ? 2 : 1)}</strong></div>
                  <div><span>{group.latestAttempt?.assessmentSource === 'BROWSER' ? 'Độ khớp khi đọc trung bình' : 'Phát âm gần nhất'}</span><strong>{Number(group.latestAttempt?.assessmentSource === 'BROWSER' ? group.latestAttempt?.averageReadingMatchScore : group.latestAttempt?.averagePronunciationScore || 0).toFixed(group.latestAttempt?.assessmentSource === 'BROWSER' ? 2 : 1)}</strong></div>
                </div>
              ) : <div className={styles.historyMetrics}>
                <div>
                  <span>{isWriting ? 'Task 1 gần nhất' : isIelts ? 'Band cao nhất' : 'Điểm cao nhất'}</span>
                  <strong>
                    {isWriting
                      ? formatSimilarity(group.latestAttempt?.task1SimilarityPercent)
                      : isIelts
                        ? formatBand(group.bestAttempt?.bandScore)
                        : formatNumber(group.bestAttempt?.totalScore)}
                  </strong>
                </div>
                <div>
                  <span>{isWriting ? 'Task 2 gần nhất' : isIelts ? 'Band gần nhất' : 'Lần gần nhất'}</span>
                  <strong>
                    {isWriting
                      ? formatSimilarity(group.latestAttempt?.task2SimilarityPercent)
                      : isIelts
                        ? formatBand(group.latestAttempt?.bandScore)
                        : formatNumber(group.latestAttempt?.totalScore)}
                  </strong>
                </div>
              </div>}

              {hasMultipleAttempts ? (
                <button
                  className={styles.expandButton}
                  type="button"
                  onClick={() => onToggle(group.examKey)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? 'Thu gọn' : 'Xem các lần làm'}
                </button>
              ) : (
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => onOpenResult(group.latestAttempt.attemptId)}
                >
                  Xem chi tiết
                </button>
              )}
            </div>

            {hasMultipleAttempts && isExpanded && (
              <div className={styles.attemptWindow}>
                {group.attempts.map((attempt, index) => {
                  const duration = isIelts ? formatDuration(attempt.durationSeconds) : '';

                  return (
                    <div key={attempt.attemptId} className={styles.attemptRow}>
                      <div>
                        <strong>Lần {group.attempts.length - index}</strong>
                        <span>{formatDateTime(attempt.submittedAt)}</span>
                      </div>

                      <div className={styles.attemptScore}>
                        {isSpeaking ? (
                          <>
                            <span>{formatNumber(attempt.practicedSampleCount)}/{formatNumber(attempt.totalSampleCount)} mẫu đã luyện</span>
                            <strong>{attempt.assessmentSource === 'BROWSER' ? 'Độ khớp khi đọc trung bình' : 'Phát âm'} {Number(attempt.assessmentSource === 'BROWSER' ? attempt.averageReadingMatchScore : attempt.averagePronunciationScore || 0).toFixed(attempt.assessmentSource === 'BROWSER' ? 2 : 1)}</strong>
                          </>
                        ) : isWriting ? (
                          <>
                            <span>
                              Task 1: {formatNumber(attempt.task1WordCount)} từ · {formatSimilarity(attempt.task1SimilarityPercent)}
                            </span>
                            <strong>
                              Task 2: {formatNumber(attempt.task2WordCount)} từ · {formatSimilarity(attempt.task2SimilarityPercent)}
                            </strong>
                            <span>Tổng: {formatNumber(attempt.totalWordCount)} từ</span>
                          </>
                        ) : (
                          <>
                            <span>{formatNumber(attempt.correctCount)}/{formatNumber(attempt.totalQuestions)} câu đúng</span>
                            <strong>{isIelts ? `Band ${formatBand(attempt.bandScore)}` : formatNumber(attempt.totalScore)}</strong>
                          </>
                        )}
                        {duration && <span>Thời gian: {duration}</span>}
                      </div>

                      <button
                        className={styles.detailButton}
                        type="button"
                        onClick={() => onOpenResult(attempt.attemptId)}
                      >
                        Chi tiết
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};

const Infor = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => authAPI.getStoredUser());
  const [activeItem, setActiveItem] = useState('profile');
  const [formData, setFormData] = useState(() => createProfileForm(authAPI.getStoredUser()));
  const [settingsForm, setSettingsForm] = useState(() => createSettingsForm(authAPI.getStoredUser()));
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [dangerPassword, setDangerPassword] = useState('');
  const [dangerSaving, setDangerSaving] = useState('');
  const [dangerError, setDangerError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [expandedExamKey, setExpandedExamKey] = useState('');
  const [activeHistoryTab, setActiveHistoryTab] = useState('TOEIC');
  const [ieltsHistory, setIeltsHistory] = useState([]);
  const [ieltsHistoryLoading, setIeltsHistoryLoading] = useState(false);
  const [ieltsHistoryError, setIeltsHistoryError] = useState('');
  const [ieltsHistoryLoaded, setIeltsHistoryLoaded] = useState(false);
  const [expandedIeltsExamKey, setExpandedIeltsExamKey] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await authAPI.getCurrentUser();

        if (response?.success && response.data) {
          setProfile(response.data);
          setFormData(createProfileForm(response.data));
          setSettingsForm(createSettingsForm(response.data));
        }
      } catch {
        const storedUser = authAPI.getStoredUser();
        setProfile(storedUser);
        setFormData(createProfileForm(storedUser));
        setSettingsForm(createSettingsForm(storedUser));
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    if (!['history', 'stats'].includes(activeItem) || historyLoaded || historyLoading) {
      return;
    }

    const loadHistory = async () => {
      try {
        setHistoryLoading(true);
        setHistoryError('');

        const response = await toeicAPI.getMyToeicHistory();

        if (response?.success) {
          setHistory(response.data || []);
        } else {
          setHistory([]);
          setHistoryError(response?.message || 'Không thể tải lịch sử làm bài.');
        }
      } catch (err) {
        setHistory([]);
        setHistoryError(err.message || 'Không thể tải lịch sử làm bài.');
      } finally {
        setHistoryLoaded(true);
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [activeItem, historyLoaded, historyLoading]);

  useEffect(() => {
    if (activeItem !== 'history' || activeHistoryTab !== 'IELTS' || ieltsHistoryLoaded || ieltsHistoryLoading) {
      return;
    }

    const loadIeltsHistory = async () => {
      try {
        setIeltsHistoryLoading(true);
        setIeltsHistoryError('');

        const response = await ieltsAPI.getMyIeltsHistory();

        if (response?.success) {
          setIeltsHistory(response.data || []);
        } else {
          setIeltsHistory([]);
          setIeltsHistoryError(response?.message || 'Không thể tải lịch sử làm bài IELTS.');
        }
      } catch (err) {
        setIeltsHistory([]);
        setIeltsHistoryError(err.message || 'Không thể tải lịch sử làm bài IELTS.');
      } finally {
        setIeltsHistoryLoaded(true);
        setIeltsHistoryLoading(false);
      }
    };

    loadIeltsHistory();
  }, [activeHistoryTab, activeItem, ieltsHistoryLoaded, ieltsHistoryLoading]);

  const groupedHistory = useMemo(() => {
    const groupMap = new Map();

    history.forEach((attempt) => {
      const examKey = String(attempt.examId || attempt.examCode || attempt.examName || attempt.attemptId);

      if (!groupMap.has(examKey)) {
        groupMap.set(examKey, {
          examKey,
          examId: attempt.examId,
          examCode: attempt.examCode,
          examName: attempt.examName || 'Bài thi TOEIC',
          attempts: [],
        });
      }

      groupMap.get(examKey).attempts.push(attempt);
    });

    return Array.from(groupMap.values())
      .map((group) => {
        const attempts = [...group.attempts].sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
        const bestAttempt = attempts.reduce((best, item) => (
          (item.totalScore || 0) > (best?.totalScore || 0) ? item : best
        ), attempts[0]);

        return {
          ...group,
          attempts,
          latestAttempt: attempts[0],
          bestAttempt,
        };
      })
      .sort((a, b) => new Date(b.latestAttempt?.submittedAt || 0) - new Date(a.latestAttempt?.submittedAt || 0));
  }, [history]);

  const groupedIeltsHistory = useMemo(() => {
    const groupMap = new Map();

    ieltsHistory.forEach((attempt) => {
      const skill = String(attempt.skill || '').toUpperCase();
      const examIdentity = attempt.examId || attempt.examCode || attempt.examName || attempt.attemptId;
      const examKey = `${examIdentity}:${skill}`;

      if (!groupMap.has(examKey)) {
        groupMap.set(examKey, {
          examKey,
          examId: attempt.examId,
          examCode: attempt.examCode,
          examName: attempt.examName || 'Bài thi IELTS',
          skill,
          attempts: [],
        });
      }

      groupMap.get(examKey).attempts.push(attempt);
    });

    return Array.from(groupMap.values())
      .map((group) => {
        const attempts = [...group.attempts].sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
        const bestAttempt = group.skill === 'WRITING'
          ? attempts[0]
          : group.skill === 'SPEAKING'
            ? attempts.reduce((best, item) => {
                const score = item.assessmentSource === 'BROWSER' ? item.averageReadingMatchScore : item.averagePronunciationScore;
                const bestScore = best?.assessmentSource === 'BROWSER' ? best?.averageReadingMatchScore : best?.averagePronunciationScore;
                return Number(score || 0) > Number(bestScore || 0) ? item : best;
              }, attempts[0])
          : attempts.reduce((best, item) => (
              Number(item.bandScore || 0) > Number(best?.bandScore || 0) ? item : best
            ), attempts[0]);

        return {
          ...group,
          attempts,
          latestAttempt: attempts[0],
          bestAttempt,
        };
      })
      .sort((a, b) => new Date(b.latestAttempt?.submittedAt || 0) - new Date(a.latestAttempt?.submittedAt || 0));
  }, [ieltsHistory]);

  const statsSummary = useMemo(() => {
    if (history.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        studyStreak: 0,
        averageAccuracy: 0,
        latestPractice: null,
        strongestExam: null,
      };
    }

    const totalAttempts = history.length;
    const totalScore = history.reduce((sum, item) => sum + (item.totalScore || 0), 0);
    const bestScore = history.reduce((max, item) => Math.max(max, item.totalScore || 0), 0);
    const totalAccuracy = history.reduce((sum, item) => {
      if (!item.totalQuestions) {
        return sum;
      }

      return sum + ((item.correctCount || 0) / item.totalQuestions) * 100;
    }, 0);

    const averageScore = Math.round(totalScore / totalAttempts);
    const averageAccuracy = Math.round(totalAccuracy / totalAttempts);
    const latestPractice = [...history].sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))[0] || null;

    const strongestExam = groupedHistory.reduce((best, group) => {
      if (!best) {
        return group;
      }

      return (group.bestAttempt?.totalScore || 0) > (best.bestAttempt?.totalScore || 0) ? group : best;
    }, null);

    const uniqueStudyDays = [...new Set(
      history
        .map((item) => {
          const date = new Date(item.submittedAt || 0);
          if (Number.isNaN(date.getTime())) {
            return null;
          }

          return date.toISOString().slice(0, 10);
        })
        .filter(Boolean)
    )].sort().reverse();

    let studyStreak = 0;
    if (uniqueStudyDays.length > 0) {
      let cursor = new Date(uniqueStudyDays[0]);
      cursor.setHours(0, 0, 0, 0);

      for (const day of uniqueStudyDays) {
        const current = new Date(day);
        current.setHours(0, 0, 0, 0);

        if (current.getTime() === cursor.getTime()) {
          studyStreak += 1;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      totalAttempts,
      averageScore,
      bestScore,
      studyStreak,
      averageAccuracy,
      latestPractice,
      strongestExam,
    };
  }, [groupedHistory, history]);

  const fullName = profile?.fullName || profile?.username || 'Nguyễn Thị A';
  const email = profile?.email || 'nguyenthida@example.com';
  const avatarInitial = fullName.trim().charAt(0).toUpperCase() || 'N';

  const reloadHistory = () => {
    if (activeHistoryTab === 'IELTS') {
      setIeltsHistoryLoaded(false);
      setExpandedIeltsExamKey('');
    } else {
      setHistoryLoaded(false);
      setExpandedExamKey('');
    }
  };

  const toggleHistoryGroup = (examKey) => {
    setExpandedExamKey((current) => (current === examKey ? '' : examKey));
  };

  const openAttemptResult = (attemptId) => {
    navigate(`/practice/toeic/result/${attemptId}`);
  };

  const openIeltsAttemptResult = (attemptId) => {
    navigate(`/practice/ielts/result/${attemptId}`);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSettingsToggle = (event) => {
    const { name, checked } = event.target;
    setSettingsForm((current) => ({
      ...current,
      [name]: checked,
    }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleTargetExamChange = (event) => {
    const { value } = event.target;
    setFormData((current) => ({
      ...current,
      targetExamType: value,
      targetScore: '',
      targetBandScore: '',
    }));
  };

  const handleEdit = () => {
    setActiveItem('profile');
    setFormData(createProfileForm(profile));
    setMessage('');
    setError('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(createProfileForm(profile));
    setMessage('');
    setError('');
    setIsEditing(false);
  };

  const handleSettingsSubmit = async (event) => {
    event.preventDefault();
    setSettingsSaving(true);
    setSettingsMessage('');
    setSettingsError('');

    try {
      const response = await authAPI.updateAccountSettings(settingsForm);
      const syncedResponse = await authAPI.syncCurrentUser();
      const savedProfile = syncedResponse?.success && syncedResponse.data ? syncedResponse.data : response?.data;

      if (response?.success && savedProfile) {
        setProfile(savedProfile);
        setSettingsForm(createSettingsForm(savedProfile));
        setSettingsMessage(response.message || 'Cập nhật cài đặt thành công.');
      } else {
        setSettingsError(response?.message || 'Không thể cập nhật cài đặt tài khoản.');
      }
    } catch (err) {
      setSettingsError(err.response?.data?.message || err.message || 'Không thể cập nhật cài đặt tài khoản.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage('');
    setPasswordError('');

    try {
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        setPasswordError('Vui lòng nhập đầy đủ thông tin đổi mật khẩu.');
        return;
      }

      const response = await authAPI.changePassword(passwordForm);

      if (response?.success) {
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setPasswordMessage(response.message || 'Đổi mật khẩu thành công.');
      } else {
        setPasswordError(response?.message || 'Không thể đổi mật khẩu.');
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || err.message || 'Không thể đổi mật khẩu.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAccountAction = async (actionType) => {
    setDangerSaving(actionType);
    setDangerError('');

    try {
      if (!dangerPassword.trim()) {
        setDangerError('Vui lòng nhập mật khẩu hiện tại để xác nhận.');
        return;
      }

      const response = await authAPI.deleteCurrentUser({ currentPassword: dangerPassword });

      if (!response?.success) {
        setDangerError(response?.message || 'Không thể xử lý yêu cầu tài khoản.');
        return;
      }

      authAPI.logout();
      window.location.href = '/login';
    } catch (err) {
      setDangerError(err.response?.data?.message || err.message || 'Không thể xử lý yêu cầu tài khoản.');
    } finally {
      setDangerSaving('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!formData.fullName.trim() || !formData.username.trim()) {
        setError('Vui lòng nhập đầy đủ họ tên và username.');
        return;
      }

      const payload = {
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        phoneNumber: formData.phoneNumber.trim() || null,
        birthDate: formData.birthDate || null,
        gender: formData.gender || null,
        learningGoal: formData.learningGoal.trim() || null,
        targetExamType: formData.targetExamType || null,
        targetScore: formData.targetExamType === 'TOEIC' && formData.targetScore !== '' ? Number(formData.targetScore) : null,
        targetBandScore: formData.targetExamType === 'IELTS' && formData.targetBandScore !== '' ? Number(formData.targetBandScore) : null,
        currentLevel: formData.currentLevel || null,
      };

      const response = await authAPI.updateCurrentUser(payload);

      if (response?.success && response.data) {
        const syncedResponse = await authAPI.syncCurrentUser();
        const savedProfile = syncedResponse?.success && syncedResponse.data ? syncedResponse.data : response.data;

        setProfile(savedProfile);
        setFormData(createProfileForm(savedProfile));
        setIsEditing(false);
        setMessage(response.message || 'Cập nhật thông tin thành công.');
      } else {
        setError(response?.message || 'Không thể cập nhật thông tin.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể cập nhật thông tin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.inforPage}>
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Menu trang cá nhân">
          <section className={styles.profileCard}>
            <div className={styles.avatar} aria-hidden="true">
              <span>{avatarInitial}</span>
            </div>

            <h1>{fullName}</h1>
            <p>{email}</p>

            <button className={styles.editButton} type="button" onClick={handleEdit}>
              Chỉnh sửa hồ sơ
            </button>
          </section>

          <nav className={styles.navList}>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={`${styles.navItem} ${activeItem === item.id ? styles.active : ''}`}
                type="button"
                onClick={() => setActiveItem(item.id)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className={styles.contentPanel} aria-label="Nội dung trang cá nhân">
          {activeItem === 'profile' && (
            <form className={styles.profileForm} onSubmit={handleSubmit}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionLabel}>Hồ sơ cá nhân</span>
                  <h2>Thông tin cá nhân</h2>
                </div>

                {!isEditing ? (
                  <button className={styles.primaryButton} type="button" onClick={handleEdit}>
                    Chỉnh sửa
                  </button>
                ) : (
                  <div className={styles.actionGroup}>
                    <button className={styles.secondaryButton} type="button" onClick={handleCancel} disabled={saving}>
                      Hủy
                    </button>
                    <button className={styles.primaryButton} type="submit" disabled={saving}>
                      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                )}
              </div>

              {message && <div className={styles.successMessage}>{message}</div>}
              {error && <div className={styles.errorMessage}>{error}</div>}

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Họ và tên</span>
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={!isEditing || saving}
                    required
                    maxLength={120}
                  />
                </label>

                <label className={styles.field}>
                  <span>Username</span>
                  <input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={!isEditing || saving}
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </label>

                <label className={styles.field}>
                  <span>Email</span>
                  <input name="email" value={formData.email} disabled readOnly />
                </label>

                <label className={styles.field}>
                  <span>Số điện thoại</span>
                  <input
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    disabled={!isEditing || saving}
                    maxLength={20}
                    placeholder="Chưa cập nhật"
                  />
                </label>

                <label className={styles.field}>
                  <span>Ngày sinh</span>
                  <input
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleChange}
                    disabled={!isEditing || saving}
                  />
                </label>

                <label className={styles.field}>
                  <span>Giới tính</span>
                  <select name="gender" value={formData.gender} onChange={handleChange} disabled={!isEditing || saving}>
                    <option value="">Chưa cập nhật</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Trình độ hiện tại</span>
                  <select
                    name="currentLevel"
                    value={formData.currentLevel}
                    onChange={handleChange}
                    disabled={!isEditing || saving}
                  >
                    <option value="">Chưa cập nhật</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Elementary">Elementary</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Upper Intermediate">Upper Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </label>

                <div className={`${styles.field} ${styles.scoreGoalField}`}>
                  <span>Mục tiêu điểm</span>

                  <div className={styles.scoreGoalGrid}>
                    <label className={styles.compactField}>
                      <span>Loại bài thi</span>
                      <select
                        name="targetExamType"
                        value={formData.targetExamType}
                        onChange={handleTargetExamChange}
                        disabled={!isEditing || saving}
                      >
                        <option value="TOEIC">TOEIC</option>
                        <option value="IELTS">IELTS</option>
                      </select>
                    </label>

                    <label className={styles.compactField}>
                      <span>{formData.targetExamType === 'IELTS' ? 'Band IELTS' : 'Điểm TOEIC'}</span>
                      {formData.targetExamType === 'IELTS' ? (
                        <select
                          name="targetBandScore"
                          value={formData.targetBandScore}
                          onChange={handleChange}
                          disabled={!isEditing || saving}
                        >
                          <option value="">Chưa cập nhật</option>
                          {ieltsBandOptions.map((band) => (
                            <option key={band} value={band}>
                              {band}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          name="targetScore"
                          value={formData.targetScore}
                          onChange={handleChange}
                          disabled={!isEditing || saving}
                        >
                          <option value="">Chưa cập nhật</option>
                          {toeicScoreOptions.map((score) => (
                            <option key={score} value={score}>
                              {score}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                  </div>
                </div>

                <label className={`${styles.field} ${styles.fullWidth}`}>
                  <span>Mục tiêu học tập</span>
                  <textarea
                    name="learningGoal"
                    value={formData.learningGoal}
                    onChange={handleChange}
                    disabled={!isEditing || saving}
                    maxLength={120}
                    rows={3}
                    placeholder="Ví dụ: Đạt TOEIC 750 trong 3 tháng"
                  />
                </label>
              </div>
            </form>
          )}

          {activeItem === 'history' && (
            <section className={styles.historyPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionLabel}>{activeHistoryTab}</span>
                  <h2>Lịch sử làm bài</h2>
                </div>

                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={reloadHistory}
                  disabled={activeHistoryTab === 'IELTS' ? ieltsHistoryLoading : historyLoading}
                >
                  Làm mới
                </button>
              </div>

              <div className={styles.historyTabs} role="tablist" aria-label="Loại bài thi">
                {['TOEIC', 'IELTS'].map((examType) => (
                  <button
                    key={examType}
                    className={`${styles.historyTab} ${activeHistoryTab === examType ? styles.historyTabActive : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={activeHistoryTab === examType}
                    onClick={() => setActiveHistoryTab(examType)}
                  >
                    {examType}
                  </button>
                ))}
              </div>

              {activeHistoryTab === 'IELTS' ? (
                ieltsHistoryLoading ? (
                  <div className={styles.historyState}>
                    <strong>Đang tải lịch sử IELTS...</strong>
                    <span>Hệ thống đang lấy các bài Listening và Reading bạn đã nộp.</span>
                  </div>
                ) : ieltsHistoryError ? (
                  <div className={styles.historyState}>
                    <strong>Không thể tải lịch sử IELTS</strong>
                    <span>{ieltsHistoryError}</span>
                    <button className={styles.primaryButton} type="button" onClick={reloadHistory}>
                      Thử lại
                    </button>
                  </div>
                ) : groupedIeltsHistory.length === 0 ? (
                  <div className={styles.historyState}>
                    <strong>Chưa có lịch sử làm bài IELTS</strong>
                    <span>Kết quả Listening hoặc Reading sẽ xuất hiện tại đây sau khi bạn nộp bài.</span>
                  </div>
                ) : (
                  <HistoryCardList
                    groups={groupedIeltsHistory}
                    examType="IELTS"
                    expandedExamKey={expandedIeltsExamKey}
                    onToggle={(examKey) => setExpandedIeltsExamKey((current) => (current === examKey ? '' : examKey))}
                    onOpenResult={openIeltsAttemptResult}
                  />
                )
              ) : historyLoading ? (
                <div className={styles.historyState}>
                  <strong>Đang tải lịch sử...</strong>
                  <span>Hệ thống đang lấy các bài bạn đã nộp.</span>
                </div>
              ) : historyError ? (
                <div className={styles.historyState}>
                  <strong>Không thể tải lịch sử</strong>
                  <span>{historyError}</span>
                  <button className={styles.primaryButton} type="button" onClick={reloadHistory}>
                    Thử lại
                  </button>
                </div>
              ) : groupedHistory.length === 0 ? (
                <div className={styles.historyState}>
                  <strong>Chưa có lịch sử làm bài</strong>
                  <span>Khi bạn nộp bài TOEIC, kết quả sẽ xuất hiện tại đây.</span>
                </div>
              ) : (
                <HistoryCardList
                  groups={groupedHistory}
                  examType="TOEIC"
                  expandedExamKey={expandedExamKey}
                  onToggle={toggleHistoryGroup}
                  onOpenResult={openAttemptResult}
                />
              )}
            </section>
          )}

          {activeItem === 'stats' && (
            <section className={styles.statsPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionLabel}>TOEIC</span>
                  <h2>Thống kê học tập</h2>
                </div>

                <button className={styles.secondaryButton} type="button" onClick={reloadHistory} disabled={historyLoading}>
                  Làm mới
                </button>
              </div>

              {historyLoading ? (
                <div className={styles.historyState}>
                  <strong>Đang tải thống kê...</strong>
                  <span>Hệ thống đang tổng hợp dữ liệu từ các bài TOEIC bạn đã làm.</span>
                </div>
              ) : historyError ? (
                <div className={styles.historyState}>
                  <strong>Không thể tải thống kê</strong>
                  <span>{historyError}</span>
                  <button className={styles.primaryButton} type="button" onClick={reloadHistory}>
                    Thử lại
                  </button>
                </div>
              ) : history.length === 0 ? (
                <div className={styles.historyState}>
                  <strong>Chưa có dữ liệu để thống kê</strong>
                  <span>Khi bạn nộp bài TOEIC đầu tiên, các chỉ số học tập sẽ xuất hiện tại đây.</span>
                </div>
              ) : (
                <div className={styles.statsContent}>
                  <div className={styles.statsGrid}>
                    <article className={styles.statCard}>
                      <span className={styles.statTag}>Tổng quan</span>
                      <strong>{formatNumber(statsSummary.totalAttempts)}</strong>
                      <h3>Bài test đã làm</h3>
                      <p>Tổng số lượt nộp bài TOEIC đã được lưu lại trong tài khoản.</p>
                    </article>

                    <article className={styles.statCard}>
                      <span className={styles.statTag}>TOEIC</span>
                      <strong>{formatNumber(statsSummary.averageScore)}</strong>
                      <h3>Điểm trung bình</h3>
                      <p>Mức điểm trung bình dựa trên toàn bộ các lần làm bài đã nộp.</p>
                    </article>

                    <article className={styles.statCard}>
                      <span className={styles.statTag}>Phong độ</span>
                      <strong>{formatNumber(statsSummary.bestScore)}</strong>
                      <h3>Điểm cao nhất</h3>
                      <p>Kết quả tốt nhất bạn từng đạt được trên một bài TOEIC.</p>
                    </article>

                    <article className={`${styles.statCard} ${styles.statCardAccent}`}>
                      <span className={styles.statTag}>Thói quen</span>
                      <strong>{formatNumber(statsSummary.studyStreak)}</strong>
                      <h3>Ngày học liên tiếp</h3>
                      <p>Chuỗi ngày bạn duy trì học và nộp bài liên tục gần nhất.</p>
                    </article>
                  </div>

                  <div className={styles.statsInsights}>
                    <article className={styles.insightCard}>
                      <span className={styles.insightLabel}>Độ chính xác trung bình</span>
                      <div className={styles.insightValue}>{formatNumber(statsSummary.averageAccuracy)}%</div>
                      <p>Dựa trên tỷ lệ câu đúng trên tổng số câu của mỗi lần làm bài.</p>
                    </article>

                    <article className={styles.insightCard}>
                      <span className={styles.insightLabel}>Lần luyện tập gần nhất</span>
                      <div className={styles.insightValueSmall}>
                        {statsSummary.latestPractice?.examName || 'Bài TOEIC'}
                      </div>
                      <p>{formatDateTime(statsSummary.latestPractice?.submittedAt)}</p>
                    </article>

                    <article className={styles.insightCard}>
                      <span className={styles.insightLabel}>Đề làm tốt nhất</span>
                      <div className={styles.insightValueSmall}>
                        {statsSummary.strongestExam?.examName || 'Chưa có dữ liệu'}
                      </div>
                      <p>
                        {statsSummary.strongestExam
                          ? `Điểm cao nhất: ${formatNumber(statsSummary.strongestExam.bestAttempt?.totalScore)}`
                          : 'Hãy làm thêm bài để hệ thống nhận diện phong độ của bạn.'}
                      </p>
                    </article>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeItem === 'settings' && (
            <section className={styles.settingsPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionLabel}>Tài khoản</span>
                  <h2>Cài đặt tài khoản</h2>
                </div>
              </div>

              <div className={styles.settingsStack}>
                <form className={styles.settingsCard} onSubmit={handleSettingsSubmit}>
                  <div className={styles.settingsCardHeader}>
                    <div>
                      <h3>Quyền riêng tư và thông báo</h3>
                      <p>Quản lý cách hồ sơ của bạn hiển thị và những thông báo cơ bản sẽ được nhận.</p>
                    </div>

                    <button className={styles.primaryButton} type="submit" disabled={settingsSaving}>
                      {settingsSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
                    </button>
                  </div>

                  {settingsMessage && <div className={styles.successMessage}>{settingsMessage}</div>}
                  {settingsError && <div className={styles.errorMessage}>{settingsError}</div>}

                  <div className={styles.toggleList}>
                    <label className={styles.toggleRow}>
                      <div>
                        <strong>Bật hồ sơ công khai</strong>
                        <span>Cho phép người dùng khác xem hồ sơ học tập công khai của bạn trên diễn đàn trong tương lai.</span>
                      </div>
                      <input
                        className={styles.toggleInput}
                        type="checkbox"
                        name="publicProfileVisible"
                        checked={settingsForm.publicProfileVisible}
                        onChange={handleSettingsToggle}
                        disabled={settingsSaving}
                      />
                    </label>

                    <label className={styles.toggleRow}>
                      <div>
                        <strong>Thông báo phản hồi bài viết</strong>
                        <span>Nhận thông báo khi có người phản hồi vào bài viết hoặc chủ đề bạn đang theo dõi.</span>
                      </div>
                      <input
                        className={styles.toggleInput}
                        type="checkbox"
                        name="notifyForumReplies"
                        checked={settingsForm.notifyForumReplies}
                        onChange={handleSettingsToggle}
                        disabled={settingsSaving}
                      />
                    </label>

                    <label className={styles.toggleRow}>
                      <div>
                        <strong>Thông báo nhắc đến bạn</strong>
                        <span>Nhận thông báo khi tài khoản của bạn được nhắc đến trong diễn đàn.</span>
                      </div>
                      <input
                        className={styles.toggleInput}
                        type="checkbox"
                        name="notifyForumMentions"
                        checked={settingsForm.notifyForumMentions}
                        onChange={handleSettingsToggle}
                        disabled={settingsSaving}
                      />
                    </label>

                    <label className={styles.toggleRow}>
                      <div>
                        <strong>Thông báo cập nhật hệ thống</strong>
                        <span>Nhận thông báo về tính năng mới, thay đổi quan trọng hoặc lịch bảo trì.</span>
                      </div>
                      <input
                        className={styles.toggleInput}
                        type="checkbox"
                        name="notifySystemUpdates"
                        checked={settingsForm.notifySystemUpdates}
                        onChange={handleSettingsToggle}
                        disabled={settingsSaving}
                      />
                    </label>
                  </div>
                </form>

                <form className={styles.settingsCard} onSubmit={handlePasswordSubmit}>
                  <div className={styles.settingsCardHeader}>
                    <div>
                      <h3>Đổi mật khẩu</h3>
                      <p>Dùng mật khẩu mạnh hơn để bảo vệ tài khoản học tập và lịch sử làm bài của bạn.</p>
                    </div>
                  </div>

                  {passwordMessage && <div className={styles.successMessage}>{passwordMessage}</div>}
                  {passwordError && <div className={styles.errorMessage}>{passwordError}</div>}

                  <div className={styles.passwordGrid}>
                    <label className={styles.field}>
                      <span>Mật khẩu hiện tại</span>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        disabled={passwordSaving}
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Mật khẩu mới</span>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        disabled={passwordSaving}
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Xác nhận mật khẩu mới</span>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        disabled={passwordSaving}
                      />
                    </label>
                  </div>

                  <div className={styles.settingsActions}>
                    <button className={styles.primaryButton} type="submit" disabled={passwordSaving}>
                      {passwordSaving ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                    </button>
                  </div>
                </form>

                <section className={`${styles.settingsCard} ${styles.dangerCard}`}>
                  <div className={styles.settingsCardHeader}>
                    <div>
                      <h3>Xóa tài khoản</h3>
                      <p>Nhập mật khẩu hiện tại để xác nhận. Hệ thống sẽ ẩn hồ sơ, xóa dữ liệu cá nhân hiển thị và khóa tài khoản vĩnh viễn.</p>
                    </div>
                  </div>

                  {dangerError && <div className={styles.errorMessage}>{dangerError}</div>}

                  <label className={styles.field}>
                    <span>Mật khẩu hiện tại</span>
                    <input
                      type="password"
                      value={dangerPassword}
                      onChange={(event) => setDangerPassword(event.target.value)}
                      disabled={Boolean(dangerSaving)}
                    />
                  </label>

                  <div className={styles.dangerActions}>
                    <button
                      className={styles.deleteButton}
                      type="button"
                      disabled={Boolean(dangerSaving)}
                      onClick={() => handleAccountAction('delete')}
                    >
                      {dangerSaving === 'delete' ? 'Đang xử lý...' : 'Xóa tài khoản'}
                    </button>
                  </div>
                </section>
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
};

export default Infor;
