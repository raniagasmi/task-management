import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { authService } from '../../services/auth.service';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await authService.forgotPassword(email.trim().toLowerCase());
      setMessage(result.message);
      if (result.resetToken) {
        toast({
          title: 'Reset link prepared',
          description: 'Opening the reset form for this demo environment.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        navigate(`/reset-password?token=${result.resetToken}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="linear-gradient(160deg, #173f3f 0%, #226968 58%, #1b4e4d 100%)" p={6}>
      <Box w="full" maxW="560px" bg="rgba(18,52,52,0.84)" borderRadius="3xl" p={{ base: 6, md: 8 }} border="1px solid rgba(216,216,219,0.14)">
        <Heading size="lg" color="#D8D8DB" mb={2}>
          Reset your password
        </Heading>
        <Text color="rgba(216,216,219,0.76)" mb={6}>
          Enter your email and we’ll prepare a secure reset link.
        </Text>

        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {message && (
          <Alert status="success" mb={4} borderRadius="md">
            <AlertIcon />
            {message}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel color="rgba(216,216,219,0.9)">Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                bg="rgba(216,216,219,0.08)"
                borderColor="rgba(216,216,219,0.26)"
                color="#D8D8DB"
                _placeholder={{ color: 'rgba(216,216,219,0.52)' }}
                _hover={{ borderColor: 'teal.300' }}
                _focusVisible={{ borderColor: 'teal.300', boxShadow: '0 0 0 1px #319795' }}
              />
            </FormControl>

            <Button type="submit" colorScheme="teal" isLoading={loading}>
              Send reset link
            </Button>

            <Text color="rgba(216,216,219,0.76)">
              Back to{' '}
              <Link as={RouterLink} to="/login" color="#7fe0db" fontWeight={600}>
                login
              </Link>
            </Text>
          </Stack>
        </form>
      </Box>
    </Flex>
  );
};

export default ForgotPassword;
