import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Badge, Box, Button, Flex, Image, Stack, Text } from '@chakra-ui/react';
import { authService } from '../../services/auth.service';
import { UserRole } from '../../types/user';
import logoImage from '../../assets/images/logo.png';

interface SideNavbarProps {
  onLogoutClick?: () => void;
}

type EmployeeNavSection = 'tasks' | 'projects' | 'calendar';

const SideNavbar = ({ onLogoutClick }: SideNavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role?.toLowerCase() === UserRole.ADMIN;
  const currentSection = (new URLSearchParams(location.search).get('section') ?? 'tasks') as EmployeeNavSection;

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

  const employeeNavItems = [
    {
      label: 'Tasks',
      isActive: location.pathname === '/app' && currentSection === 'tasks',
      onClick: () => navigate('/app'),
    },
    {
      label: 'Projects',
      isActive: location.pathname === '/app' && currentSection === 'projects',
      onClick: () => navigate('/app?section=projects'),
    },
    {
      label: 'Calendar',
      isActive: location.pathname === '/app' && currentSection === 'calendar',
      onClick: () => navigate('/app?section=calendar'),
    },
    {
      label: 'Collaboration',
      isActive: location.pathname === '/collaboration',
      onClick: () => navigate('/collaboration'),
    },
  ];

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
          {isAdmin ? (
            <>
              <Text as={NavLink} to="/app" sx={navLinkSx}>
                Tasks
              </Text>
              <Text as={NavLink} to="/collaboration" sx={navLinkSx}>
                Collaboration
              </Text>
              <Text as={NavLink} to="/recruitment" sx={navLinkSx}>
                Recruitment
              </Text>
              <Text as={NavLink} to="/admin" sx={navLinkSx}>
                Admin
              </Text>
            </>
          ) : (
            employeeNavItems.map((item) => (
              <Button
                key={item.label}
                onClick={item.onClick}
                variant="ghost"
                justifyContent="flex-start"
                px={3}
                py={2}
                h="auto"
                borderRadius="md"
                fontSize="0.95rem"
                fontWeight={600}
                letterSpacing="0.02em"
                color={item.isActive ? '#7ee8d6' : 'var(--font-color)'}
                bg={item.isActive ? 'rgba(126, 232, 214, 0.16)' : 'transparent'}
                w="full"
                _hover={{
                  color: '#7ee8d6',
                  bg: 'rgba(126, 232, 214, 0.12)',
                }}
              >
                {item.label}
              </Button>
            ))
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
          w="full"
          justifyContent="center"
        >
          View Profile
        </Button>

        {onLogoutClick && (
          <Button
            onClick={onLogoutClick}
            colorScheme="red"
            variant="outline"
            size="sm"
            w="full"
            justifyContent="center"
            borderRadius="md"
            transition="all 0.2s ease"
            _hover={{
              bg: 'red.500',
              color: 'white',
              borderColor: 'red.500',
              transform: 'translateY(-1px)',
              boxShadow: '0 10px 20px rgba(239, 68, 68, 0.24)',
            }}
          >
            Logout
          </Button>
        )}
      </Stack>
    </Flex>
  );
};

export default SideNavbar;
