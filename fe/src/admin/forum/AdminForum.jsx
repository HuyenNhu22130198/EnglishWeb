import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConfirmDialog } from '../../contexts/useConfirmDialog';
import AdminPageHeader from '../components/AdminPageHeader';
import Pagination from '../components/Pagination';
import shared from '../AdminShared.module.css';
import { adminForumAPI } from './adminForumService';
import { FORUM_CATEGORY_LABELS } from '../../services/forumService';

const formatDate = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '');

export default function AdminForum() {
  const confirm = useConfirmDialog();
  const [tab, setTab] = useState('posts');

  const [posts, setPosts] = useState([]);
  const [postsPage, setPostsPage] = useState(0);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [postsLoading, setPostsLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const [reports, setReports] = useState([]);
  const [reportsPage, setReportsPage] = useState(0);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const [reportsLoading, setReportsLoading] = useState(true);

  const [error, setError] = useState('');

  const loadPosts = useCallback(async (page = 0) => {
    setPostsLoading(true);
    setError('');
    try {
      const response = await adminForumAPI.getPosts({ page, size: 20, keyword: keyword || undefined });
      setPosts(response.data.items);
      setPostsPage(response.data.page);
      setPostsTotalPages(Math.max(1, response.data.totalPages));
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách bài viết.');
    } finally {
      setPostsLoading(false);
    }
  }, [keyword]);

  const loadReports = useCallback(async (page = 0) => {
    setReportsLoading(true);
    setError('');
    try {
      const response = await adminForumAPI.getReports({ status: 'PENDING', page, size: 20 });
      setReports(response.data.items);
      setReportsPage(response.data.page);
      setReportsTotalPages(Math.max(1, response.data.totalPages));
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách báo cáo.');
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'posts') loadPosts(0);
  }, [tab, loadPosts]);

  useEffect(() => {
    if (tab === 'reports') loadReports(0);
  }, [tab, loadReports]);

  const handleDeletePost = async (post) => {
    const confirmed = await confirm({
      title: 'Xóa bài viết?',
      message: `Bài viết "${post.title}" và toàn bộ bình luận sẽ bị xóa vĩnh viễn.`,
      confirmLabel: 'Xóa bài viết',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await adminForumAPI.deletePost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
    } catch (err) {
      setError(err.message || 'Không thể xóa bài viết.');
    }
  };

  const handleDismiss = async (report) => {
    try {
      await adminForumAPI.dismissReport(report.id);
      setReports((current) => current.filter((item) => item.id !== report.id));
    } catch (err) {
      setError(err.message || 'Không thể bỏ qua báo cáo.');
    }
  };

  const handleResolveKeep = async (report) => {
    try {
      await adminForumAPI.resolveReport(report.id, false);
      setReports((current) => current.filter((item) => item.id !== report.id));
    } catch (err) {
      setError(err.message || 'Không thể xử lý báo cáo.');
    }
  };

  const handleResolveDelete = async (report) => {
    const confirmed = await confirm({
      title: 'Xóa nội dung vi phạm?',
      message:
        report.targetType === 'POST'
          ? `Bài viết "${report.postTitle}" sẽ bị xóa vĩnh viễn.`
          : 'Bình luận bị báo cáo sẽ bị xóa vĩnh viễn.',
      confirmLabel: 'Xóa nội dung',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await adminForumAPI.resolveReport(report.id, true);
      setReports((current) => current.filter((item) => item.id !== report.id));
    } catch (err) {
      setError(err.message || 'Không thể xử lý báo cáo.');
    }
  };

  return (
    <div className={shared.page}>
      <AdminPageHeader
        title="Quản lý diễn đàn"
        subtitle="Kiểm duyệt bài viết, xử lý báo cáo vi phạm từ người dùng."
      >
        <button
          type="button"
          className={tab === 'posts' ? shared.primaryButton : shared.secondaryButton}
          onClick={() => setTab('posts')}
        >
          Bài viết
        </button>
        <button
          type="button"
          className={tab === 'reports' ? shared.primaryButton : shared.secondaryButton}
          onClick={() => setTab('reports')}
        >
          Báo cáo vi phạm
        </button>
      </AdminPageHeader>

      {error && <div className={shared.errorBox}>{error}</div>}

      {tab === 'posts' && (
        <div className={shared.panel}>
          <div className={shared.toolbar}>
            <div className={shared.searchWrap}>
              <input
                className={shared.searchInput}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && loadPosts(0)}
                placeholder="Tìm theo tiêu đề hoặc nội dung..."
              />
            </div>
            <button type="button" className={shared.secondaryButton} onClick={() => loadPosts(0)}>
              Tìm kiếm
            </button>
          </div>

          {postsLoading ? (
            <div className={shared.emptyState}>Đang tải...</div>
          ) : posts.length === 0 ? (
            <div className={shared.emptyState}>Không có bài viết nào.</div>
          ) : (
            <div className={shared.tableWrap}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>Tiêu đề</th>
                    <th>Tác giả</th>
                    <th>Chủ đề</th>
                    <th>Thích</th>
                    <th>Bình luận</th>
                    <th>Báo cáo</th>
                    <th>Ngày đăng</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id}>
                      <td style={{ maxWidth: 280 }}>{post.title}</td>
                      <td>{post.author?.fullName || post.author?.username}</td>
                      <td>{FORUM_CATEGORY_LABELS[post.category] || post.category}</td>
                      <td>{post.likeCount}</td>
                      <td>{post.commentCount}</td>
                      <td>{post.reportCount > 0 ? <strong style={{ color: '#b42318' }}>{post.reportCount}</strong> : 0}</td>
                      <td>{formatDate(post.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Link
                            to={`/forum/posts/${post.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={shared.secondaryButton}
                          >
                            Xem
                          </Link>
                          <button type="button" className={shared.dangerButton} onClick={() => handleDeletePost(post)}>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={shared.panelFooter}>
            <Pagination currentPage={postsPage + 1} totalPages={postsTotalPages} onPageChange={(page) => loadPosts(page - 1)} />
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className={shared.panel}>
          {reportsLoading ? (
            <div className={shared.emptyState}>Đang tải...</div>
          ) : reports.length === 0 ? (
            <div className={shared.emptyState}>Không có báo cáo nào đang chờ xử lý.</div>
          ) : (
            <div className={shared.tableWrap}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>Loại</th>
                    <th>Nội dung bị báo cáo</th>
                    <th>Người báo cáo</th>
                    <th>Lý do</th>
                    <th>Thời gian</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.targetType === 'POST' ? 'Bài viết' : 'Bình luận'}</td>
                      <td style={{ maxWidth: 260 }}>
                        {report.targetType === 'POST' ? report.postTitle : report.commentContent}
                      </td>
                      <td>{report.reporter?.fullName || report.reporter?.username}</td>
                      <td style={{ maxWidth: 220 }}>{report.reason}</td>
                      <td>{formatDate(report.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Link
                            to={`/forum/posts/${report.postId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={shared.secondaryButton}
                          >
                            Xem bài viết
                          </Link>
                          <button type="button" className={shared.secondaryButton} onClick={() => handleDismiss(report)}>
                            Bỏ qua
                          </button>
                          <button type="button" className={shared.secondaryButton} onClick={() => handleResolveKeep(report)}>
                            Giữ lại
                          </button>
                          <button type="button" className={shared.dangerButton} onClick={() => handleResolveDelete(report)}>
                            Xóa nội dung
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={shared.panelFooter}>
            <Pagination currentPage={reportsPage + 1} totalPages={reportsTotalPages} onPageChange={(page) => loadReports(page - 1)} />
          </div>
        </div>
      )}
    </div>
  );
}
