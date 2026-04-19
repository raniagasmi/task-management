import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Flex, VStack } from '@chakra-ui/react';
import { authService } from '../../services/auth.service';
import { userService } from '../../services/user.service';
import { User } from '../../types/user';
import { Profile } from '../profile/Profile';
import Breezycherryblossoms from '../design/Breezycherrybossoms';
import Particles from '../design/particles';
import Pattern from '../design/Pattern';
import Hexagon from '../design/Hexagon';
import ThemeSelector from '../selectors/ThemeSelector';
import BannerSelector from '../selectors/BannerSelector';
import SideNavbar from '../layout/SideNavbar';

type BannerType = 'Breezy' | 'Particles' | 'Pattern' | 'Hexagon';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerType>('Particles');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await userService.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        authService.logout();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    const storedBanner = localStorage.getItem('Banner') as BannerType;
    setBanner(storedBanner || 'Particles');
  }, [navigate]);

  const handleProfileSave = async (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Flex bg="var(--light-color)" minH="100vh">
      <SideNavbar onLogoutClick={handleLogout} />
      <Box flex={1} p={{ base: 6, md: 10 }} overflowY="auto">
        <VStack gap={0} align="stretch" borderRadius="xl" overflow="hidden" bg="var(--light-color)">
          <Box w="100%" h="30vh" position="relative" bg="var(--dark-color)">
            <BannerSelector setBanner={setBanner} />
            {banner === 'Breezy' && <Breezycherryblossoms />}
            {banner === 'Particles' && <Particles />}
            {banner === 'Pattern' && <Pattern />}
            {banner === 'Hexagon' && <Hexagon />}
            <Box ml={5} bg="var(--light-color)" position="absolute" top="22vh" p={2} borderRadius="full">
              <Avatar size="2xl" name="Dan Abrahmov" src="https://bit.ly/dan-abramov" />
            </Box>
          </Box>
          <Box>
            {user && <Profile user={user} onSave={handleProfileSave} />}
          </Box>
        </VStack>
      </Box>
      <ThemeSelector />
    </Flex>
  );
};

export default ProfilePage;
