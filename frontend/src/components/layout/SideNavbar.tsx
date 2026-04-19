import { NavLink, useNavigate } from 'react-router-dom';
import { Badge, Box, Button, Flex, IconButton, Image, Stack, Text } from '@chakra-ui/react';
import { NotAllowedIcon } from '@chakra-ui/icons';
import { authService } from '../../services/auth.service';
import { UserRole } from '../../types/user';
import logoImage from '../../assets/images/logo.png';

interface SideNavbarProps {
  onLogoutClick?: () => void;
}

const SideNavbar = ({ onLogoutClick }: SideNavbarProps) => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role?.toLowerCase() === UserRole.ADMIN;

  const navLinkSx = {
    display: 'inline-flex',
    alignItems: 'center',
    width: '100%',
    px: 3,
    py: 2,
    borderRadius: 'md',
    fontSize: '0.95rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: 'var(--font-color)',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    _hover: {
      color: '#7ee8d6',
      bg: 'rgba(126, 232, 214, 0.12)',
    },
    '&[aria-current="page"]': {
      color: '#7ee8d6',
      bg: 'rgba(126, 232, 214, 0.16)',
    },
  };

  return (
    <Flex
      as="aside"
      w={{ base: '200px', md: '240px' }}
      h="100vh"
      position="sticky"
      top={0}
      flexShrink={0}
      px={4}
      py={6}
      direction="column"
      justify="space-between"
      bg="var(--dark-color)"
      borderRight="1px solid"
      borderColor="whiteAlpha.200"
    >
      <Box>
        <Image src={logoImage} alt="Task Manager logo" maxW="150px" mb={6} />

        <Stack spacing={2}>
          <Text as={NavLink} to="/" sx={navLinkSx}>
            Tasks
          </Text>
          <Text as={NavLink} to="/collaboration" sx={navLinkSx}>
            Collaboration
          </Text>
          {isAdmin && (
            <>
              <Text as={NavLink} to="/recruitment" sx={navLinkSx}>
                Recruitment
              </Text>
              <Text as={NavLink} to="/admin" sx={navLinkSx}>
                Admin
              </Text>
            </>
          )}
        </Stack>
      </Box>

      <Stack spacing={3}>
        <Badge colorScheme={isAdmin ? 'purple' : 'teal'} borderRadius="full" px={3} py={1} textTransform="capitalize" alignSelf="flex-start">
          {currentUser?.role || 'guest'}
        </Badge>

        <Button
          onClick={() => navigate('/profile')}
          colorScheme="teal"
          variant="outline"
          size="sm"
        >
          View Profile
        </Button>

        {onLogoutClick && (
          <IconButton
            aria-label="Logout"
            variant="outline"
            colorScheme="teal"
            size="sm"
            onClick={onLogoutClick}
            icon={<NotAllowedIcon />}
          />
        )}
      </Stack>
    </Flex>
  );
};

export default SideNavbar;
