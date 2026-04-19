import { NavLink } from 'react-router-dom';
import { Badge, Box, Flex, HStack, Text } from '@chakra-ui/react';
import { authService } from '../../services/auth.service';
import { UserRole } from '../../types/user';

const TopNavbar = () => {
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role?.toLowerCase() === UserRole.ADMIN;

  const navLinkSx = {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.95rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: 'var(--font-color)',
    textDecoration: 'none',
    transition: 'color 0.2s ease, text-decoration-color 0.2s ease',
    _hover: {
      color: '#7ee8d6',
      textDecoration: 'underline',
      textDecorationThickness: '2px',
      textUnderlineOffset: '6px',
    },
    '&[aria-current="page"]': {
      color: '#7ee8d6',
      textDecoration: 'underline',
      textDecorationThickness: '2px',
      textUnderlineOffset: '6px',
    },
  };

  return (
    <Box
      as="header"
      w="full"
      borderBottom="1px solid"
      borderColor="whiteAlpha.200"
      bg="rgba(40, 40, 45, 0.9)"
      backdropFilter="blur(12px)"
      position="sticky"
      top={0}
      zIndex={20}
    >
      <Flex
        maxW="1400px"
        mx="auto"
        px={{ base: 4, md: 6 }}
        py={4}
        align="center"
        justify="space-between"
      >
        <Text fontSize="lg" fontWeight={800} color="var(--font-color)">
          Task Manager
        </Text>

        <HStack spacing={4} gap={4}>
          <Text as={NavLink} to="/" sx={navLinkSx}>
            Tasks
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
        </HStack>

        <Badge colorScheme={isAdmin ? 'purple' : 'teal'} borderRadius="full" px={3} py={1} textTransform="capitalize">
          {currentUser?.role || 'guest'}
        </Badge>
      </Flex>
    </Box>
  );
};

export default TopNavbar;