import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ExamSessionProvider } from './contexts/ExamSessionContext';
import { ConfirmDialogProvider } from './contexts/ConfirmDialogContext';
import ProtectedRoute from './components/ProtectedRoute';

import Header from './components/Header';
import Footer from './components/Footer';
import FloatingDictionary from './components/FloatingDictionary';
import Home from './pages/Home';
import ToeicExams from './pages/ToeicExams';
import IeltsExams from './pages/IeltsExams';
import IeltsExamDetail from './pages/IeltsExamDetail';
import IeltsPractice from './pages/IeltsPractice';
import IeltsWriting from './pages/IeltsWriting';
import IeltsSpeakingFree from './pages/IeltsSpeakingFree';
import IeltsResult from './pages/IeltsResult';
import Flashcard from './pages/Flashcard';
import Infor from './pages/Infor';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import ToeicPractice from './pages/ToeicPractice';
import ToeicResult from './pages/ToeicResult';
import ToeicExamDetail from './pages/ToeicExamDetail';
import Forum from './pages/Forum';
import ForumPostDetail from './pages/ForumPostDetail';
import Guide from './pages/Guide';
import Contact from './pages/Contact';

import AdminRoute from './admin/AdminRoute';
import AdminLayout from './admin/AdminLayout';
import AdminDictionaryPage from './admin/dictionary/AdminDictionaryPage';
import AdminUsers from "./admin/AdminUsers";
import AdminBanners from "./admin/banners/AdminBanners";
import AdminFlashcards from "./admin/flashcards/AdminFlashcards";
import AdminExams from "./admin/exams/AdminExams";
import AdminExamDetail from "./admin/exams/AdminExamDetail";
import AdminExamCreate from "./admin/exams/AdminExamCreate";
import AdminForum from "./admin/forum/AdminForum";


function App() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  }, [location.pathname, location.search]);

  const noLayoutPages = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
  ];
  const isPracticePage =
    location.pathname.startsWith('/practice/toeic/') ||
    location.pathname.startsWith('/practice/ielts/');
  const isAdminPage = location.pathname.startsWith('/admin');

  const hideLayout =
    noLayoutPages.includes(location.pathname) || isPracticePage || isAdminPage;

  return (
    <ConfirmDialogProvider>
      <AuthProvider>
        <ExamSessionProvider>
        <div>
        {!hideLayout && <Header />}

        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dictionary" replace />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="dictionary" element={<AdminDictionaryPage />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="flashcards" element={<AdminFlashcards />} />
            <Route path="toeic-exams" element={<AdminExams />} />
            <Route path="forum" element={<AdminForum />} />
            <Route path="exams/:type/new" element={<AdminExamCreate />} />
            <Route path="exams/:type/:id" element={<AdminExamDetail />} />
          </Route>

          <Route path="/" element={<Home />} />
          <Route path="/flashcard" element={<Flashcard />} />

          <Route path="/exams/toeic" element={<ToeicExams />} />
          <Route path="/exams/toeic/:examId" element={<ToeicExamDetail />} />

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
          <Route path="/exams/ielts/:examId" element={<IeltsExamDetail />} />
          <Route
            path="/practice/ielts/:examId/writing"
            element={
              <ProtectedRoute>
                <IeltsWriting />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice/ielts/:examId/speaking/free"
            element={
              <ProtectedRoute>
                <IeltsSpeakingFree />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice/ielts/:examId"
            element={
              <ProtectedRoute>
                <IeltsPractice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice/ielts/result/:attemptId"
            element={
              <ProtectedRoute>
                <IeltsResult />
              </ProtectedRoute>
            }
          />

          <Route path="/forum" element={<Forum />} />
          <Route path="/forum/posts/:id" element={<ForumPostDetail />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/contact" element={<Contact />} />

          <Route
            path="/infor"
            element={
              <ProtectedRoute>
                <Infor />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>

        <FloatingDictionary />
        {!hideLayout && <Footer />}
        </div>
        </ExamSessionProvider>
      </AuthProvider>
    </ConfirmDialogProvider>
  );
}

export default App;
