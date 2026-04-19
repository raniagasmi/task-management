import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { userService } from '../../services/user.service';
import {
  Flex, Box
} from '@chakra-ui/react';
import ThemeSelector from '../selectors/ThemeSelector';
import SideNavbar from '../layout/SideNavbar';

import Board from '../tasks/Board';

const HomePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      try {
        await userService.getCurrentUser();
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
    return <div className="loading">Loading...</div>;
  }

  return (
    <Flex bg="var(--light-color)" w="100vw" minH="100vh">
      <SideNavbar onLogoutClick={handleLogout} />
      <Flex flex={1} direction="column">
        <Box flex={1} p={20} overflowY="auto">
          <Board />
        </Box>
      </Flex>
      <ThemeSelector />
    </Flex>
  );
};

export default HomePage;
