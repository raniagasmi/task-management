import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Link,
  Stack,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { CheckCircleIcon, ChatIcon, TimeIcon } from '@chakra-ui/icons';
import { authService } from '../../services/auth.service';
import PasswordField from './PasswordField';
import { getPasswordChecklist } from './auth.utils';

const Register = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setFieldError((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!formData.email.trim()) nextErrors.email = 'Work email is required.';
    const checklist = getPasswordChecklist(formData.password);
    if (!Object.values(checklist).every(Boolean)) {
      nextErrors.password = 'Use 8+ characters with upper, lower, number, and symbol.';
    }
    if (formData.confirmPassword !== formData.password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    setFieldError(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const result = await authService.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      toast({
        title: 'Account created',
        description: 'Finish onboarding and verify your email to activate all trust features.',
        status: 'success',
        duration: 3500,
        isClosable: true,
      });

      navigate(`/welcome${result.verificationToken ? `?verificationToken=${result.verificationToken}` : ''}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to register');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to register. Please try again.');
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
      justifyContent="center"
      alignItems="stretch"
      minH="100vh"
      bg="linear-gradient(160deg, #173f3f 0%, #226968 58%, #1b4e4d 100%)"
      px={{ base: 4, md: 8 }}
      py={{ base: 6, md: 10 }}
    >
      <Flex
        w="100%"
        maxW="1240px"
        mx="auto"
        direction={{ base: 'column', lg: 'row' }}
        borderRadius="3xl"
        overflow="hidden"
        border="1px solid rgba(216,216,219,0.14)"
        boxShadow="0 25px 80px rgba(0,0,0,0.3)"
        bg="rgba(18,52,52,0.66)"
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
            Fast, trusted setup
          </Badge>

          <Heading size={{ base: 'lg', md: 'xl' }} color="#D8D8DB" mb={3} lineHeight="1.1">
            Create your workspace and start with a low-friction onboarding flow
          </Heading>

          <Text color="rgba(216,216,219,0.82)" maxW="42ch" mb={8}>
            Sign up once, confirm your email, capture your team context, and move directly into tasks, collaboration, and recruitment.
          </Text>

          <Stack spacing={4}>
            <HStack spacing={3} p={3} borderRadius="xl" bg="rgba(216,216,219,0.08)">
              <Icon as={CheckCircleIcon} color="teal.300" />
              <Text color="#D8D8DB" fontSize="sm">Email verification and password recovery built in</Text>
            </HStack>
            <HStack spacing={3} p={3} borderRadius="xl" bg="rgba(216,216,219,0.08)">
              <Icon as={ChatIcon} color="teal.300" />
              <Text color="#D8D8DB" fontSize="sm">Onboarding captures team size, role, and primary use case</Text>
            </HStack>
            <HStack spacing={3} p={3} borderRadius="xl" bg="rgba(216,216,219,0.08)">
              <Icon as={TimeIcon} color="teal.300" />
              <Text color="#D8D8DB" fontSize="sm">Invite teammates right after signup instead of circling back later</Text>
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
            Create your account
          </Heading>
          <Text mb={6} color="rgba(216,216,219,0.78)">
            Use email or request enterprise SSO, then complete a short onboarding step.
          </Text>

          <Stack spacing={3} mb={5}>
            <Button variant="outline" borderColor="rgba(216,216,219,0.26)" color="#D8D8DB" onClick={() => void handleSso('google')}>
              Sign up with Google
            </Button>
            <Button variant="outline" borderColor="rgba(216,216,219,0.26)" color="#D8D8DB" onClick={() => void handleSso('microsoft')}>
              Sign up with Microsoft
            </Button>
          </Stack>

          <HStack spacing={3} mb={5}>
            <Divider borderColor="rgba(216,216,219,0.16)" />
            <Text color="rgba(216,216,219,0.58)" fontSize="sm" whiteSpace="nowrap">
              or continue with email
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
              <HStack spacing={4} align="start" flexDir={{ base: 'column', md: 'row' }}>
                <FormControl isRequired isInvalid={!!fieldError.firstName}>
                  <FormLabel color="rgba(216,216,219,0.9)">First Name</FormLabel>
                  <Input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    bg="rgba(216,216,219,0.08)"
                    borderColor="rgba(216,216,219,0.26)"
                    color="#D8D8DB"
                    _placeholder={{ color: 'rgba(216,216,219,0.52)' }}
                    _hover={{ borderColor: 'teal.300' }}
                    _focusVisible={{ borderColor: 'teal.300', boxShadow: '0 0 0 1px #319795' }}
                  />
                  {fieldError.firstName && <FormErrorMessage>{fieldError.firstName}</FormErrorMessage>}
                </FormControl>

                <FormControl isRequired isInvalid={!!fieldError.lastName}>
                  <FormLabel color="rgba(216,216,219,0.9)">Last Name</FormLabel>
                  <Input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    bg="rgba(216,216,219,0.08)"
                    borderColor="rgba(216,216,219,0.26)"
                    color="#D8D8DB"
                    _placeholder={{ color: 'rgba(216,216,219,0.52)' }}
                    _hover={{ borderColor: 'teal.300' }}
                    _focusVisible={{ borderColor: 'teal.300', boxShadow: '0 0 0 1px #319795' }}
                  />
                  {fieldError.lastName && <FormErrorMessage>{fieldError.lastName}</FormErrorMessage>}
                </FormControl>
              </HStack>

              <FormControl isRequired isInvalid={!!fieldError.email}>
                <FormLabel color="rgba(216,216,219,0.9)">Work Email</FormLabel>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  bg="rgba(216,216,219,0.08)"
                  borderColor="rgba(216,216,219,0.26)"
                  color="#D8D8DB"
                  _placeholder={{ color: 'rgba(216,216,219,0.52)' }}
                  _hover={{ borderColor: 'teal.300' }}
                  _focusVisible={{ borderColor: 'teal.300', boxShadow: '0 0 0 1px #319795' }}
                />
                {fieldError.email && <FormErrorMessage>{fieldError.email}</FormErrorMessage>}
              </FormControl>

              <PasswordField
                label="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                showStrength
                isRequired
                autoComplete="new-password"
                error={fieldError.password}
              />

              <PasswordField
                label="Confirm Password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                isRequired
                autoComplete="new-password"
                error={fieldError.confirmPassword}
              />

              <Text fontSize="sm" color="rgba(216,216,219,0.68)">
                By creating an account, you’ll continue to a quick onboarding step for team context and invitations.
              </Text>

              <Button type="submit" colorScheme="teal" width="100%" isLoading={loading} loadingText="Creating account..." mt={2}>
                Create account
              </Button>
            </VStack>
          </form>

          <Text textAlign="center" mt={4} color="rgba(216,216,219,0.78)">
            Already have an account?{' '}
            <Link as={RouterLink} to="/login" color="#7fe0db" fontWeight={600}>
              Login
            </Link>
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
};

export default Register;
