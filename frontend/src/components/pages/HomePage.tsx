import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { userService } from '../../services/user.service';
import {
  Flex,
  Box,
  Spinner,
  Center,
} from '@chakra-ui/react';
import ThemeSelector from '../selectors/ThemeSelector';
import SideNavbar from '../layout/SideNavbar';
import Board from '../tasks/Board';
import { AdminDashboard } from '../admin/AdminDashboard';
import { UserRole } from '../../types/user';
import { EmployeeDashboard, type EmployeeDashboardSection } from '../employee/EmployeeDashboard';
import { TaskReminderToasts } from '../notifications/TaskReminderToasts';

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const validateSession = async () => {
      try {
        const user = await userService.getCurrentUser();
        setUserRole(user.role);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        authService.logout();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <Center w="100vw" h="100vh" bg="var(--light-color)">
        <Spinner size="lg" />
      </Center>
    );
  }

  const isAdmin = userRole === UserRole.ADMIN;
  const section = new URLSearchParams(location.search).get('section');
  const initialSection =
    section === 'work-hub' || section === 'projects' || section === 'calendar' || section === 'alerts'
      ? (section as any as EmployeeDashboardSection)
      : undefined;

  return (
    <Flex bg="var(--light-color)" w="100vw" minH="100vh">
      <SideNavbar onLogoutClick={handleLogout} />
      <Flex flex={1} direction="column">
        <Box flex={1} p={20} overflowY="auto">
          {isAdmin ? (
            <AdminDashboard isAdmin={true} />
          ) : (
            <EmployeeDashboard initialSection={initialSection} />
          )}
        </Box>
      </Flex>
      <TaskReminderToasts />
      <ThemeSelector />
    </Flex>
  );
};

export default HomePage;
