import { Navigate } from 'react-router-dom';

const getCurrentUser = () => {
  try {
    const rawUser = localStorage.getItem('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
};

const AdminRoute = ({ children }) => {
  const user = getCurrentUser();

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;