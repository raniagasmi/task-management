import { Navigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { UserRole } from '../../types/user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = currentUser?.role?.toLowerCase();
    const permittedRoles = allowedRoles.map((item) => item.toLowerCase());

    if (!role || !permittedRoles.includes(role as UserRole)) {
      return <Navigate to="/app" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
