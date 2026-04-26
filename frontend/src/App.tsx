import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './components/pages/HomePage';
import ProfilePage from './components/pages/ProfilePage';
import MarketingLandingPage from './components/pages/MarketingLandingPage';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import WelcomeOnboarding from './components/auth/WelcomeOnboarding';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RecruitmentPage from './components/recruitment/RecruitmentPage';
import AdminPage from './components/pages/AdminPage';
import CollaborationPage from './components/collaboration/CollaborationPage';
import { ThemeProvider } from './context/ThemeContext'; 
import { UserRole } from './types/user';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MarketingLandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/app" element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } />
            <Route path="/welcome" element={
              <ProtectedRoute>
                <WelcomeOnboarding />
              </ProtectedRoute>
            } />
            <Route path="/recruitment" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <RecruitmentPage />
              </ProtectedRoute>
            } />
            <Route path="/collaboration" element={
              <ProtectedRoute>
                <CollaborationPage />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AdminPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
