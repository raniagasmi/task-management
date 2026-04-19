import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import axios from 'axios';
import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Alert,
  AlertIcon,
  Spinner,
  Text,
  Link,
  VStack,
  Flex,
  Heading,
  HStack,
  Stack,
  Icon,
} from '@chakra-ui/react';
import { CheckCircleIcon, ChatIcon, TimeIcon } from '@chakra-ui/icons';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
  
    try {
      await authService.register(formData);
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      
      // Type-safe error handling
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

  return (
    <Flex
      justifyContent="center"
      alignItems="stretch"
      minH="100vh"
      bg="linear-gradient(160deg, #28282D 0%, #333339 60%, #2d2d34 100%)"
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
        boxShadow="0 25px 80px rgba(0,0,0,0.35)"
        bg="rgba(40,40,45,0.66)"
        backdropFilter="blur(8px)"
      >
        <Box
          flex={{ base: '0', lg: '1' }}
          minH={{ base: '260px', lg: 'auto' }}
          p={{ base: 6, md: 10 }}
          position="relative"
          bg="linear-gradient(180deg, rgba(40,40,45,0.95) 0%, rgba(51,51,57,0.9) 100%)"
          borderRight={{ base: 'none', lg: '1px solid rgba(216,216,219,0.12)' }}
        >
          <Badge
            colorScheme="teal"
            variant="subtle"
            px={3}
            py={1}
            borderRadius="full"
            mb={4}
          >
            Build Your Team Space
          </Badge>

          <Heading size={{ base: 'lg', md: 'xl' }} color="#D8D8DB" mb={3} lineHeight="1.1">
            Start Managing Tasks and Hiring Together
          </Heading>

          <Text color="rgba(216,216,219,0.82)" maxW="42ch" mb={8}>
            Create your account to set up workflows, organize priorities, and run recruitment operations from a single workspace.
          </Text>

          <Stack spacing={4}>
            <HStack spacing={3} p={3} borderRadius="xl" bg="rgba(216,216,219,0.08)">
              <Icon as={CheckCircleIcon} color="teal.300" />
              <Text color="#D8D8DB" fontSize="sm">Create and track team tasks in real-time boards</Text>
            </HStack>
            <HStack spacing={3} p={3} borderRadius="xl" bg="rgba(216,216,219,0.08)">
              <Icon as={ChatIcon} color="teal.300" />
              <Text color="#D8D8DB" fontSize="sm">Coordinate HR and recruitment tasks with context</Text>
            </HStack>
            <HStack spacing={3} p={3} borderRadius="xl" bg="rgba(216,216,219,0.08)">
              <Icon as={TimeIcon} color="teal.300" />
              <Text color="#D8D8DB" fontSize="sm">Move faster with clear ownership and deadlines</Text>
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
            filter="blur(8px)"
          />
        </Box>

        <Box flex={{ base: '1', lg: '0.9' }} p={{ base: 6, md: 10 }} bg="rgba(40,40,45,0.82)">
          <Heading mb={2} textAlign="left" size="lg" color="#D8D8DB">
            Create your account
          </Heading>
          <Text mb={6} color="rgba(216,216,219,0.78)">
            Join your workspace and start collaborating today.
          </Text>

          {error && (
            <Alert status="error" mb={4} borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="rgba(216,216,219,0.9)">First Name</FormLabel>
                <Input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter your first name"
                  bg="rgba(216,216,219,0.08)"
                  borderColor="rgba(216,216,219,0.26)"
                  color="#D8D8DB"
                  _placeholder={{ color: 'rgba(216,216,219,0.52)' }}
                  _hover={{ borderColor: 'teal.300' }}
                  _focusVisible={{ borderColor: 'teal.300', boxShadow: '0 0 0 1px #4fd1c5' }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="rgba(216,216,219,0.9)">Last Name</FormLabel>
                <Input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter your last name"
                  bg="rgba(216,216,219,0.08)"
                  borderColor="rgba(216,216,219,0.26)"
                  color="#D8D8DB"
                  _placeholder={{ color: 'rgba(216,216,219,0.52)' }}
                  _hover={{ borderColor: 'teal.300' }}
                  _focusVisible={{ borderColor: 'teal.300', boxShadow: '0 0 0 1px #4fd1c5' }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="rgba(216,216,219,0.9)">Email</FormLabel>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  bg="rgba(216,216,219,0.08)"
                  borderColor="rgba(216,216,219,0.26)"
                  color="#D8D8DB"
                  _placeholder={{ color: 'rgba(216,216,219,0.52)' }}
                  _hover={{ borderColor: 'teal.300' }}
                  _focusVisible={{ borderColor: 'teal.300', boxShadow: '0 0 0 1px #4fd1c5' }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="rgba(216,216,219,0.9)">Password</FormLabel>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  bg="rgba(216,216,219,0.08)"
                  borderColor="rgba(216,216,219,0.26)"
                  color="#D8D8DB"
                  _placeholder={{ color: 'rgba(216,216,219,0.52)' }}
                  _hover={{ borderColor: 'teal.300' }}
                  _focusVisible={{ borderColor: 'teal.300', boxShadow: '0 0 0 1px #4fd1c5' }}
                />
              </FormControl>

              <Button type="submit" colorScheme="teal" width="100%" disabled={loading} mt={2}>
                {loading ? <Spinner size="sm" /> : 'Register'}
              </Button>
            </VStack>
          </form>

          <Text textAlign="center" mt={4} color="rgba(216,216,219,0.78)">
            Already have an account?{' '}
            <Link as={RouterLink} to="/login" color="#4fd1c5" fontWeight={600}>
              Login
            </Link>
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
};

export default Register;
