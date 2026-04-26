import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  Heading,
  Link,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { authService } from '../../services/auth.service';
import PasswordField from './PasswordField';
import { getPasswordChecklist } from './auth.utils';

const ResetPassword = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') ?? '', [params]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!token) {
      setError('Missing reset token.');
      return false;
    }
    if (!Object.values(getPasswordChecklist(password)).every(Boolean)) {
      setError('Use 8+ characters with upper, lower, number, and symbol.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      await authService.resetPassword(token, password);
      toast({
        title: 'Password updated',
        description: 'You can now sign in with your new password.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="linear-gradient(160deg, #173f3f 0%, #226968 58%, #1b4e4d 100%)" p={6}>
      <Box w="full" maxW="560px" bg="rgba(18,52,52,0.84)" borderRadius="3xl" p={{ base: 6, md: 8 }} border="1px solid rgba(216,216,219,0.14)">
        <Heading size="lg" color="#D8D8DB" mb={2}>
          Choose a new password
        </Heading>
        <Text color="rgba(216,216,219,0.76)" mb={6}>
          Create a strong password before returning to your workspace.
        </Text>

        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            <PasswordField
              label="New password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              showStrength
              isRequired
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirm new password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              isRequired
              autoComplete="new-password"
            />
            <Button type="submit" colorScheme="teal" isLoading={loading}>
              Update password
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

export default ResetPassword;
