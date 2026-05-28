import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Header from './components/Header';
import Hero from './components/Hero';
import CourseCard from './components/CourseCard';
import Footer from './components/Footer';
import ToeicExams from './pages/ToeicExams';
import IeltsExams from './pages/IeltsExams';
import Dictionary from './pages/Dictionary';
import Infor from './pages/Infor';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ToeicPractice from './pages/ToeicPractice';
import ToeicResult from './pages/ToeicResult';

function App() {
  const location = useLocation();

  const noLayoutPages = ['/login', '/register', '/forgot-password'];
  const isPracticePage = location.pathname.startsWith('/practice/toeic/');
  const hideLayout = noLayoutPages.includes(location.pathname) || isPracticePage;

  return (
    <AuthProvider>
      <div>
        {!hideLayout && <Header />}

        <Routes>
          {/* Trang chủ */}
          <Route
            path="/"
            element={
              <>
                <Hero />

                {/* Courses Section */}
                <section id="courses" style={{ padding: '96px 0', backgroundColor: 'white' }}>
                  <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                      <div style={{ color: '#904d00', fontWeight: '600', letterSpacing: '2px', fontSize: '15px' }}>
                        KHÓA HỌC NỔI BẬT
                      </div>
                      <h2 style={{ fontSize: '42px', fontWeight: '700', marginTop: '16px', color: '#1b1c1c' }}>
                        Chọn lộ trình phù hợp với bạn
                      </h2>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                        gap: '32px',
                      }}
                    >
                      <CourseCard
                        title="English Communication"
                        level="Beginner → Intermediate"
                        duration="12 tuần"
                      />

                      <CourseCard
                        title="IELTS Intensive"
                        level="Mục tiêu 6.5 - 7.5+"
                        duration="16 tuần"
                        isHot={true}
                      />

                      <CourseCard
                        title="Business English"
                        level="Intermediate → Advanced"
                        duration="10 tuần"
                      />
                    </div>
                  </div>
                </section>

                {/* Final CTA */}
                <section
                  style={{
                    backgroundColor: '#0e3377',
                    padding: '100px 24px',
                    color: 'white',
                    textAlign: 'center',
                  }}
                >
                  <div className="container">
                    <h2 style={{ fontSize: '42px', fontWeight: '700', marginBottom: '24px' }}>
                      Sẵn sàng nâng tầm tiếng Anh của bạn?
                    </h2>

                    <p style={{ fontSize: '20px', maxWidth: '700px', margin: '0 auto 48px', opacity: 0.9 }}>
                      Hàng ngàn học viên đã thay đổi khả năng tiếng Anh nhờ phương pháp học tại StudyEnglishWithNhu
                    </p>

                    <button
                      style={{
                        padding: '20px 52px',
                        backgroundColor: 'white',
                        color: '#0e3377',
                        fontSize: '20px',
                        fontWeight: '600',
                        borderRadius: '9999px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Đăng ký tư vấn miễn phí ngay
                    </button>
                  </div>
                </section>
              </>
            }
          />

          {/* Trang từ điển */}
          <Route path="/dictionary" element={<Dictionary />} />

          {/* Trang Kho đề TOEIC */}
          <Route path="/exams/toeic" element={<ToeicExams />} />

          <Route
            path="/practice/toeic/:testId"
            element={
              <ProtectedRoute>
                <ToeicPractice />
              </ProtectedRoute>
            }
          />
          <Route path="/practice/toeic/result/:attemptId" element={<ToeicResult />} />

          <Route path="/exams/ielts" element={<IeltsExams />} />

          {/* Trang cá nhân - Cần login */}
          <Route
            path="/infor"
            element={
              <ProtectedRoute>
                <Infor />
              </ProtectedRoute>
            }
          />

          {/* Các trang auth độc lập, không có Header/Footer */}
          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>

      {!hideLayout && <Footer />}      
      </div>
    </AuthProvider>
  );
}

export default App;