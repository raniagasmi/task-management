import { Navigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();

  if (isAuthenticated && currentUser) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
