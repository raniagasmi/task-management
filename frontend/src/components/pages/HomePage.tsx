import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { userService } from '../../services/user.service';
import {
  Flex, Avatar, Box,
  Drawer, DrawerBody, VStack, DrawerOverlay,
  DrawerContent, useDisclosure
} from '@chakra-ui/react';
import { User } from '../../types/user';
import { Profile } from '../profile/Profile';
import Breezycherryblossoms from '../design/Breezycherrybossoms';
import Particles from '../design/particles';
import Pattern from '../design/Pattern';
import Hexagon from '../design/Hexagon';
import ThemeSelector from '../selectors/ThemeSelector';
import BannerSelector from '../selectors/BannerSelector';
import SideNavbar from '../layout/SideNavbar';

import Board from '../tasks/Board';

type BannerType = "Breezy" | "Particles" | "Pattern" | "Hexagon";

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();

  const [Banner, setBanner] = useState<BannerType>("Particles");

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
    <Flex bg="var(--light-color)" w="100vw" minH="100vh">
      <SideNavbar onProfileClick={onDrawerOpen} onLogoutClick={handleLogout} />
      <Flex flex={1} direction="column">
        <Box flex={1} p={20} overflowY="auto">
          <Board />
        </Box>
      </Flex>
      <ThemeSelector />

      <Drawer onClose={onDrawerClose} placement="left" isOpen={isDrawerOpen} size="xl">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerBody p={0} bg="var(--light-color)">
            <VStack gap={0} align="stretch">
              <Box w="100%" h="30vh" position="relative" bg="var(--dark-color)">
                <BannerSelector setBanner={setBanner} />
                {Banner === "Breezy" && <Breezycherryblossoms />}
                {Banner === "Particles" && <Particles />}
                {Banner === "Pattern" && <Pattern />}
                {Banner === "Hexagon" && <Hexagon />}
                <Box ml={5} bg="var(--light-color)" position="absolute" top="22vh" p={2} borderRadius="full">
                  <Avatar size="2xl" name="Dan Abrahmov" src="https://bit.ly/dan-abramov" />
                </Box>
              </Box>
              <Box>
                {user && <Profile user={user}  onSave={handleProfileSave} />}
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
};

export default HomePage;
