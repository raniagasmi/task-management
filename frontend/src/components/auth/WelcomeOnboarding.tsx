import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { authService } from '../../services/auth.service';
import { normalizeInviteList } from './auth.utils';
import { userService } from '../../services/user.service';

const WelcomeOnboarding = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const verificationToken = useMemo(() => params.get('verificationToken') ?? '', [params]);
  const currentUser = authService.getCurrentUser();

  const [form, setForm] = useState({
    teamSize: currentUser?.teamSize ?? '',
    workspaceRole: currentUser?.workspaceRole ?? '',
    primaryUseCase: currentUser?.primaryUseCase ?? '',
    inviteTeammates: (currentUser?.invitedTeammates ?? []).join(', '),
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVerify = async () => {
    if (!verificationToken) return;
    setVerifying(true);
    try {
      const result = await authService.verifyEmail(verificationToken);
      setMessage(result.message);
      toast({ title: 'Email verified', status: 'success', duration: 2500, isClosable: true });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to verify email right now.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!currentUser?.email) return;
    const result = await authService.resendVerification(currentUser.email);
    setMessage(result.message);
    toast({ title: 'Verification link refreshed', status: 'info', duration: 2500, isClosable: true });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      await userService.updateProfile({
        teamSize: form.teamSize,
        primaryUseCase: form.primaryUseCase,
        invitedTeammates: normalizeInviteList(form.inviteTeammates),
        onboardingCompleted: true,
        workspaceRole: form.workspaceRole,
      });
      toast({
        title: 'Onboarding saved',
        description: 'Your workspace is ready.',
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
      navigate('/app');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to save onboarding right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" justify="center" align="center" bg="linear-gradient(160deg, #173f3f 0%, #226968 58%, #1b4e4d 100%)" p={6}>
      <Box w="full" maxW="920px" bg="rgba(18,52,52,0.84)" borderRadius="3xl" p={{ base: 6, md: 10 }} border="1px solid rgba(216,216,219,0.14)">
        <Badge colorScheme="teal" mb={4} borderRadius="full" px={3} py={1}>
          Welcome
        </Badge>
        <Heading color="#D8D8DB" mb={2}>
          Set up your workspace in one quick step
        </Heading>
        <Text color="rgba(216,216,219,0.76)" mb={8}>
          Add the basics now so tasks, collaboration, and hiring recommendations feel relevant from day one.
        </Text>

        {(message || !currentUser?.emailVerified) && (
          <Alert status={currentUser?.emailVerified ? 'success' : 'info'} mb={6} borderRadius="xl">
            <AlertIcon />
            <Stack spacing={2} flex={1}>
              <Text>{message || 'Verify your email to strengthen account recovery and enterprise trust signals.'}</Text>
              {!currentUser?.emailVerified && (
                <Flex gap={3} wrap="wrap">
                  {verificationToken && (
                    <Button size="sm" colorScheme="teal" onClick={() => void handleVerify()} isLoading={verifying}>
                      Verify email now
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => void handleResend()}>
                    Resend verification
                  </Button>
                </Flex>
              )}
            </Stack>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={5}>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
              <FormControl isRequired>
                <FormLabel color="rgba(216,216,219,0.9)">Team size</FormLabel>
                <Select name="teamSize" value={form.teamSize} onChange={handleChange} bg="rgba(216,216,219,0.08)" borderColor="rgba(216,216,219,0.26)" color="#D8D8DB">
                  <option value="">Select your team size</option>
                  <option value="1-10">1-10</option>
                  <option value="11-25">11-25</option>
                  <option value="26-100">26-100</option>
                  <option value="100+">100+</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="rgba(216,216,219,0.9)">Your role</FormLabel>
                <Select name="workspaceRole" value={form.workspaceRole} onChange={handleChange} bg="rgba(216,216,219,0.08)" borderColor="rgba(216,216,219,0.26)" color="#D8D8DB">
                  <option value="">Select your role</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                  <option value="hr">HR</option>
                  <option value="developer">Developer</option>
                </Select>
              </FormControl>
            </SimpleGrid>

            <FormControl isRequired>
              <FormLabel color="rgba(216,216,219,0.9)">Primary use case</FormLabel>
              <Select name="primaryUseCase" value={form.primaryUseCase} onChange={handleChange} bg="rgba(216,216,219,0.08)" borderColor="rgba(216,216,219,0.26)" color="#D8D8DB">
                <option value="">Select the main reason you’re here</option>
                <option value="task_execution">Task execution</option>
                <option value="collaborative_hiring">Collaborative hiring</option>
                <option value="cross_functional_operations">Cross-functional operations</option>
                <option value="delivery_and_hr">Delivery + HR in one workspace</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel color="rgba(216,216,219,0.9)">Invite teammates</FormLabel>
              <Input
                name="inviteTeammates"
                value={form.inviteTeammates}
                onChange={handleChange}
                placeholder="name@company.com, teammate@company.com"
                bg="rgba(216,216,219,0.08)"
                borderColor="rgba(216,216,219,0.26)"
                color="#D8D8DB"
              />
              <Text mt={2} color="rgba(216,216,219,0.62)" fontSize="sm">
                Separate multiple emails with commas. We’ll save them for the next invite step.
              </Text>
            </FormControl>

            <Flex gap={3} justify="flex-end" wrap="wrap">
              <Button variant="ghost" color="#D8D8DB" onClick={() => navigate('/app')}>
                Skip for now
              </Button>
              <Button type="submit" colorScheme="teal" isLoading={loading}>
                Finish onboarding
              </Button>
            </Flex>
          </Stack>
        </form>
      </Box>
    </Flex>
  );
};

export default WelcomeOnboarding;
