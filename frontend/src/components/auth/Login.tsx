import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Stack,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { CheckCircleIcon, ChatIcon, LockIcon, TimeIcon } from '@chakra-ui/icons';
import { authService } from '../../services/auth.service';
import PasswordField from './PasswordField';

const Login = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Enter your email and password to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.login(formData);
      toast({
        title: 'Login successful',
        description: 'Welcome back to your workspace.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/app', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Login failed');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSso = async (provider: 'google' | 'microsoft') => {
    try {
      const response = await authService.initiateSso(provider, formData.email || undefined);
      toast({
        title: `${provider === 'google' ? 'Google' : 'Microsoft'} SSO`,
        description: response.message,
        status: response.available ? 'success' : 'info',
        duration: 4500,
        isClosable: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start SSO right now.';
      toast({ title: 'SSO unavailable', description: message, status: 'error', duration: 3500, isClosable: true });
    }
  };

  return (
    <Flex
      align="stretch"
      justify="center"
      minH="100vh"
      bg="linear-gradient(160deg, #173f3f 0%, #226968 58%, #1b4e4d 100%)"
      px={{ base: 4, md: 8 }}
      py={{ base: 6, md: 10 }}
    >
      <Flex
        w="100%"
        maxW="1200px"
        mx="auto"
        direction={{ base: 'column', lg: 'row' }}
        borderRadius="3xl"
        overflow="hidden"
        border="1px solid rgba(216,216,219,0.14)"
        boxShadow="0 25px 80px rgba(0,0,0,0.28)"
        bg="rgba(19,63,63,0.64)"
        backdropFilter="blur(8px)"
      >
        <Box
          flex={{ base: '0', lg: '1' }}
          minH={{ base: '260px', lg: 'auto' }}
          p={{ base: 6, md: 10 }}
          position="relative"
          bg="linear-gradient(180deg, rgba(18,58,58,0.96) 0%, rgba(35,88,87,0.9) 100%)"
          borderRight={{ base: 'none', lg: '1px solid rgba(216,216,219,0.12)' }}
        >
          <Badge colorScheme="teal" variant="subtle" px={3} py={1} borderRadius="full" mb={4}>
            Secure team workspace
          </Badge>
          <Heading size={{ base: 'lg', md: 'xl' }} color="#D8D8DB" mb={3} lineHeight="1.1">
            Return to the workspace where delivery and hiring stay aligned
          </Heading>
          <Text color="rgba(216,216,219,0.82)" maxW="42ch" mb={8}>
            Track execution, collaborate on decisions, and manage hiring context without hopping between disconnected tools.
          </Text>

          <Stack spacing={4}>
            <HStack spacing={3} p={3} borderRadius="xl" bg="rgba(216,216,219,0.08)">
              <Icon as={TimeIcon} color="teal.300" />
              <Text color="#D8D8DB" fontSize="sm">Always-on visibility for tasks and reminders</Text>
            </HStack>
            <HStack spacing={3} p={3} borderRadius="xl" bg="rgba(216,216,219,0.08)">
              <Icon as={ChatIcon} color="teal.300" />
              <Text color="#D8D8DB" fontSize="sm">Collaboration threads with AI-assisted planning</Text>
            </HStack>
            <HStack spacing={3} p={3} borderRadius="xl" bg="rgba(216,216,219,0.08)">
              <Icon as={CheckCircleIcon} color="teal.300" />
              <Text color="#D8D8DB" fontSize="sm">Recruitment workflows connected to execution priorities</Text>
            </HStack>
          </Stack>

          <Box
            position="absolute"
            bottom="-60px"
            right="-40px"
            w="200px"
            h="200px"
            borderRadius="full"
            bg="rgba(49, 151, 149, 0.22)"
            filter="blur(10px)"
          />
        </Box>

        <Box flex={{ base: '1', lg: '0.94' }} p={{ base: 6, md: 10 }} bg="rgba(18,52,52,0.84)">
          <Heading mb={2} textAlign="left" size="lg" color="#D8D8DB">
            Welcome back
          </Heading>
          <Text mb={6} color="rgba(216,216,219,0.78)">
            Sign in with your email or request enterprise SSO.
          </Text>

          <Stack spacing={3} mb={5}>
            <Button variant="outline" borderColor="rgba(216,216,219,0.26)" color="#D8D8DB" onClick={() => void handleSso('google')}>
              Continue with Google
            </Button>
            <Button variant="outline" borderColor="rgba(216,216,219,0.26)" color="#D8D8DB" onClick={() => void handleSso('microsoft')}>
              Continue with Microsoft
            </Button>
          </Stack>

          <HStack spacing={3} mb={5}>
            <Divider borderColor="rgba(216,216,219,0.16)" />
            <Text color="rgba(216,216,219,0.58)" fontSize="sm" whiteSpace="nowrap">
              or use email
            </Text>
            <Divider borderColor="rgba(216,216,219,0.16)" />
          </HStack>

          {error && (
            <Alert status="error" mb={4} borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel color="rgba(216,216,219,0.9)">Email</FormLabel>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  isDisabled={loading}
                  autoComplete="email"
                  autoFocus
                  bg="rgba(216,216,219,0.08)"
                  borderColor="rgba(216,216,219,0.26)"
                  color="#D8D8DB"
                  _placeholder={{ color: 'rgba(216,216,219,0.52)' }}
                  _hover={{ borderColor: 'teal.300' }}
                  _focusVisible={{ borderColor: 'teal.300', boxShadow: '0 0 0 1px #319795' }}
                />
              </FormControl>

              <PasswordField
                label="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                isRequired
                autoComplete="current-password"
              />

              <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                <Text fontSize="sm" color="rgba(216,216,219,0.68)">
                  Your account stays encrypted and role-scoped.
                </Text>
                <Link to="/forgot-password" style={{ color: '#7fe0db', fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </Flex>

              <Button
                type="submit"
                colorScheme="teal"
                width="full"
                isLoading={loading}
                loadingText="Signing in..."
                mt={2}
                leftIcon={<LockIcon />}
              >
                Login
              </Button>

              <Text color="rgba(216,216,219,0.78)" textAlign="center">
                Don&apos;t have an account?{' '}
                <Link to="/register" style={{ color: '#7fe0db', fontWeight: 600 }}>
                  Register here
                </Link>
              </Text>
            </VStack>
          </form>
        </Box>
      </Flex>
    </Flex>
  );
};

export default Login;
