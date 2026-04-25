import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  Icon,
  Heading,
  HStack,
  IconButton,
  Input,
  ListItem,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Stack,
  Switch,
  Text,
  Tooltip,
  UnorderedList,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, CopyIcon, ExternalLinkIcon, HamburgerIcon } from '@chakra-ui/icons';
import { BellOff, Archive, MessageSquareText, Trash2 } from 'lucide-react';
import {
  CopilotMessageRole,
  CopilotThreadSummary,
  JobOffer,
  recruitmentService,
} from '../../services/recruitment.service';
import SideNavbar from '../layout/SideNavbar';
import { authService } from '../../services/auth.service';
import { useNavigate } from 'react-router-dom';

type RecruitmentFlowState =
  | 'idle'
  | 'generating_job'
  | 'job_ready'
  | 'approved'
  | 'generating_post'
  | 'done';

interface ChatMessage {
  id: string;
  role: CopilotMessageRole;
  content: string;
}

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const RecruitmentPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [state, setState] = useState<RecruitmentFlowState>('idle');
  const [prompt, setPrompt] = useState('');
  const [jobOffer, setJobOffer] = useState<JobOffer | null>(null);
  const [jobOfferId, setJobOfferId] = useState('');
  const [linkedinPost, setLinkedinPost] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<CopilotThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [showArchivedThreads, setShowArchivedThreads] = useState(false);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const activeThread = useMemo(
    () => threads.find((thread) => thread.threadId === activeThreadId),
    [threads, activeThreadId],
  );

  const visibleThreads = useMemo(
    () => threads.filter((thread) => showArchivedThreads || !thread.isArchived),
    [showArchivedThreads, threads],
  );

  const archivedThreadCount = useMemo(
    () => threads.filter((thread) => thread.isArchived).length,
    [threads],
  );

  const stateColor: Record<RecruitmentFlowState, string> = {
    idle: 'gray',
    generating_job: 'blue',
    job_ready: 'teal',
    approved: 'green',
    generating_post: 'purple',
    done: 'orange',
  };

  const resolveJobOfferId = (offer: JobOffer) => offer.id ?? offer._id ?? offer.jobOfferId ?? '';

  const refreshThreads = async (preferThreadId?: string) => {
    const payload = await recruitmentService.listCopilotThreads();
    const nextThreads = payload.threads.filter((thread) => !!thread.threadId);
    setThreads(nextThreads);

    const nextThreadId =
      preferThreadId && nextThreads.some((thread) => thread.threadId === preferThreadId)
        ? preferThreadId
        : nextThreads.find((thread) => !thread.isArchived)?.threadId
          ?? nextThreads[0]?.threadId
          ?? '';
    setActiveThreadId(nextThreadId);
    recruitmentService.setActiveThreadId(nextThreadId);
    return nextThreadId;
  };

  const loadThreadMessages = async (threadId: string) => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    const thread = await recruitmentService.getCopilotThread(threadId);
    setMessages(
      thread.messages.map((message) => ({
        id: message.id || createMessageId(),
        role: message.role,
        content: message.content,
      })),
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const threadId = await refreshThreads();
        if (!threadId) {
          const created = await recruitmentService.createCopilotThread();
          if (cancelled) return;
          await refreshThreads(created.threadId);
          await loadThreadMessages(created.threadId);
          return;
        }

        if (cancelled) return;
        await loadThreadMessages(threadId);
      } catch (error) {
        console.warn('Failed to hydrate copilot threads:', error);
      } finally {
        if (!cancelled) {
          setLoadingThreads(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const appendMessage = (role: CopilotMessageRole, content: string) => {
    const normalized = content.trim();
    if (!normalized || !activeThreadId) {
      return;
    }

    setMessages((prev) => [...prev, { id: createMessageId(), role, content: normalized }]);
    void recruitmentService.appendCopilotMessage(role, normalized).catch((error) => {
      console.warn('Failed to persist copilot message:', error);
    });
  };

  const handleSelectThread = async (threadId: string) => {
    setActiveThreadId(threadId);
    recruitmentService.setActiveThreadId(threadId);
    await loadThreadMessages(threadId);
    setJobOffer(null);
    setJobOfferId('');
    setLinkedinPost('');
    setState('idle');
  };

  const handleCreateThread = async () => {
    try {
      const created = await recruitmentService.createCopilotThread();
      await refreshThreads(created.threadId);
      await loadThreadMessages(created.threadId);
      setState('idle');
      setJobOffer(null);
      setJobOfferId('');
      setLinkedinPost('');
    } catch (error) {
      toast({
        title: 'Failed to create chat',
        description: error instanceof Error ? error.message : 'Unexpected error',
        status: 'error',
        duration: 2500,
        isClosable: true,
      });
    }
  };

  const handleArchiveThread = async (thread: CopilotThreadSummary) => {
    try {
      await recruitmentService.archiveCopilotThread(thread.threadId, !thread.isArchived);
      const next = await refreshThreads(activeThreadId === thread.threadId && !thread.isArchived ? undefined : activeThreadId);
      await loadThreadMessages(next);
    } catch (error) {
      toast({
        title: 'Failed to archive chat',
        description: error instanceof Error ? error.message : 'Unexpected error',
        status: 'error',
        duration: 2500,
        isClosable: true,
      });
    }
  };

  const handleMuteThread = async (thread: CopilotThreadSummary) => {
    try {
      await recruitmentService.muteCopilotThread(thread.threadId, !thread.isMuted);
      await refreshThreads(activeThreadId);
    } catch (error) {
      toast({
        title: 'Failed to mute chat',
        description: error instanceof Error ? error.message : 'Unexpected error',
        status: 'error',
        duration: 2500,
        isClosable: true,
      });
    }
  };

  const handleDeleteThread = async (thread: CopilotThreadSummary) => {
    try {
      await recruitmentService.deleteCopilotThread(thread.threadId);
      const next = await refreshThreads(activeThreadId === thread.threadId ? undefined : activeThreadId);
      await loadThreadMessages(next);
    } catch (error) {
      toast({
        title: 'Failed to delete chat',
        description: error instanceof Error ? error.message : 'Unexpected error',
        status: 'error',
        duration: 2500,
        isClosable: true,
      });
    }
  };

  const handleGenerate = async () => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || !activeThreadId) {
      return;
    }

    appendMessage('user', normalizedPrompt);
    setPrompt('');
    setState('generating_job');

    try {
      const offer = await recruitmentService.generateJobOffer(normalizedPrompt);
      setJobOffer(offer);
      const resolvedId = resolveJobOfferId(offer);
      setJobOfferId(resolvedId);
      setLinkedinPost('');

      appendMessage(
        'assistant',
        resolvedId
          ? 'Job offer generated. Please review and approve it to unlock LinkedIn post generation.'
          : 'Job offer generated. Please review and approve. Warning: no jobOfferId was returned.',
      );
      setState('job_ready');
      await refreshThreads(activeThreadId);
      toast({ title: 'Job offer generated', status: 'success', duration: 2500, isClosable: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate job offer.';
      appendMessage('assistant', `Generation failed: ${message}`);
      setState('idle');
      toast({ title: 'Generation failed', description: message, status: 'error', duration: 3000, isClosable: true });
    }
  };

  const handleApprove = () => {
    setState('approved');
    appendMessage('assistant', 'Job offer approved. You can now generate the LinkedIn post.');
  };

  const handleGeneratePost = async () => {
    if (!jobOfferId) {
      toast({
        title: 'Missing jobOfferId',
        description: 'I cannot generate the LinkedIn post yet.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    appendMessage('user', 'Generate post');
    setState('generating_post');

    try {
      const post = await recruitmentService.generateLinkedInPost(jobOfferId);
      setLinkedinPost(post);
      appendMessage('assistant', post);
      setState('done');
      toast({ title: 'LinkedIn post generated', status: 'success', duration: 2500, isClosable: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate post.';
      appendMessage('assistant', `Post generation failed: ${message}`);
      setState('approved');
      toast({ title: 'Post generation failed', description: message, status: 'error', duration: 3000, isClosable: true });
    }
  };

  const copyText = async (content: string, label: string) => {
    await navigator.clipboard.writeText(content);
    toast({ title: `${label} copied`, status: 'success', duration: 2000, isClosable: true });
  };

  const copyJobOfferSummary = async () => {
    if (!jobOffer) return;
    const content = [
      `Title: ${jobOffer.title}`,
      `Seniority: ${jobOffer.seniorityLevel}`,
      '',
      `Description: ${jobOffer.description}`,
      '',
      'Required Skills:',
      ...jobOffer.requiredSkills.map((item) => `- ${item}`),
      '',
      'Responsibilities:',
      ...jobOffer.responsibilities.map((item) => `- ${item}`),
      ...(jobOffer.niceToHave.length > 0 ? ['', 'Nice to Have:', ...jobOffer.niceToHave.map((item) => `- ${item}`)] : []),
    ].join('\n');
    await copyText(content, 'Job offer');
  };

  const linkedinFeedUrl = 'https://www.linkedin.com/feed/';

  const formatPreview = (value?: string) => {
    if (!value) {
      return 'No messages yet';
    }
    return value.length > 72 ? `${value.slice(0, 72).trimEnd()}...` : value;
  };

  return (
    <Flex bg="var(--light-color)" minH="100vh">
      <SideNavbar onLogoutClick={handleLogout} />
      <Stack flex={1} maxW="1450px" spacing={6} px={{ base: 4, md: 8 }} py={{ base: 6, md: 8 }}>
        <Flex justify="space-between" align="center" gap={3}>
          <Box>
            <Heading size="lg" color="var(--font-color)">
              Recruitment AI Copilot
            </Heading>
            <Text mt={2} color="gray.500">
              Persistent chat history per user, with one-click flow from prompt to approval and LinkedIn post.
            </Text>
            <HStack mt={3}>
              <Badge colorScheme={stateColor[state]}>State: {state}</Badge>
              <Badge colorScheme="blue">{activeThread?.title || 'New recruitment chat'}</Badge>
            </HStack>
          </Box>

          <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={handleCreateThread}>
            New Job Offer Chat
          </Button>
        </Flex>

        <Grid templateColumns={{ base: '1fr', lg: '300px 1fr 1fr' }} gap={6} alignItems="start">
          <Box
            bg="rgba(255,255,255,0.88)"
            backdropFilter="blur(16px)"
            borderRadius="3xl"
            boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)"
            p={5}
            h="100%"
            overflow="hidden"
          >
            <Flex justify="space-between" align="center" mb={4}>
              <Box>
                <Text fontWeight="700" color="#0f172a">
                  Chat History
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {visibleThreads.length} visible threads
                </Text>
              </Box>
              <Flex align="center" gap={2}>
                <Flex align="center" gap={2}>
                  <Text fontSize="xs" color="gray.500">
                    Show archived
                  </Text>
                  <Switch size="sm" isChecked={showArchivedThreads} onChange={(event) => setShowArchivedThreads(event.target.checked)} />
                </Flex>
                {archivedThreadCount > 0 && (
                  <Badge colorScheme="orange" borderRadius="full">
                    {archivedThreadCount}
                  </Badge>
                )}
              </Flex>
            </Flex>

            <Stack spacing={3} maxH="65vh" overflowY="auto">
              {loadingThreads ? (
                <Flex align="center" justify="center" h="60%">
                  <Spinner size="lg" color="teal.500" />
                </Flex>
              ) : visibleThreads.length === 0 ? (
                <Box borderRadius="xl" bg="whiteAlpha.800" p={4} borderWidth="1px" borderColor="whiteAlpha.400">
                  <Text fontWeight="600" color="slate.700">
                    No recruitment chats yet
                  </Text>
                  <Text color="slate.500" fontSize="sm" mt={1}>
                    Start a new job offer chat to keep the history here.
                  </Text>
                </Box>
              ) : (
                visibleThreads.map((thread) => {
                  const isSelected = thread.threadId === activeThreadId;
                  return (
                    <Box
                      key={thread.threadId}
                      onClick={() => void handleSelectThread(thread.threadId)}
                      cursor="pointer"
                      borderRadius="xl"
                      p={4}
                      bg={isSelected ? 'rgba(13,148,136,0.12)' : 'whiteAlpha.800'}
                      borderWidth="1px"
                      borderColor={isSelected ? 'teal.300' : 'whiteAlpha.500'}
                      boxShadow={isSelected ? '0 12px 28px rgba(15, 23, 42, 0.12)' : 'sm'}
                      transition="all 0.2s ease"
                      _hover={{ transform: 'translateY(-1px)', borderColor: 'teal.200' }}
                    >
                      <Flex justify="space-between" align="flex-start" gap={3}>
                        <Box minW={0}>
                          <Flex align="center" gap={2} wrap="wrap">
                            {thread.isArchived && <Badge colorScheme="orange">Archived</Badge>}
                            {thread.isMuted && <Badge colorScheme="gray">Muted</Badge>}
                            <Text fontWeight="700" color="#0f172a" noOfLines={1}>
                              {thread.title || 'New recruitment chat'}
                            </Text>
                          </Flex>
                          <Text color="slate.500" fontSize="sm" mt={1} noOfLines={2}>
                            {formatPreview(thread.lastMessagePreview)}
                          </Text>
                        </Box>

                        <Menu>
                          <MenuButton
                            as={IconButton}
                            aria-label="Thread actions"
                            icon={<HamburgerIcon />}
                            size="xs"
                            variant="ghost"
                            onClick={(event) => event.stopPropagation()}
                          />
                          <MenuList onClick={(event) => event.stopPropagation()}>
                            <MenuItem icon={<Icon as={MessageSquareText} boxSize={4} />} onClick={() => void handleSelectThread(thread.threadId)}>
                              Open chat
                            </MenuItem>
                            <MenuItem icon={<Icon as={BellOff} boxSize={4} />} onClick={() => void handleMuteThread(thread)}>
                              {thread.isMuted ? 'Unmute chat' : 'Mute chat'}
                            </MenuItem>
                            <MenuItem icon={<Icon as={Archive} boxSize={4} />} onClick={() => void handleArchiveThread(thread)}>
                              {thread.isArchived ? 'Unarchive chat' : 'Archive chat'}
                            </MenuItem>
                            <MenuItem color="red.500" icon={<Icon as={Trash2} boxSize={4} />} onClick={() => void handleDeleteThread(thread)}>
                              Delete chat
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Flex>
                    </Box>
                  );
                })
              )}
            </Stack>
          </Box>

          <Box borderWidth="1px" borderRadius="lg" bg="white" p={4}>
            <Heading size="md" mb={4}>
              Copilot Chat
            </Heading>

            <Stack spacing={3} maxH="56vh" overflowY="auto" pr={1}>
              {messages.map((item) => (
                <Flex key={item.id} justify={item.role === 'user' ? 'flex-end' : 'flex-start'}>
                  <Box
                    maxW="86%"
                    borderWidth="1px"
                    borderColor={item.role === 'user' ? 'blue.200' : 'gray.200'}
                    bg={item.role === 'user' ? 'blue.50' : 'gray.50'}
                    borderRadius="lg"
                    px={3}
                    py={2}
                  >
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" mb={1}>
                      {item.role}
                    </Text>
                    <Text whiteSpace="pre-wrap">{item.content}</Text>
                  </Box>
                </Flex>
              ))}
              {state === 'generating_job' && (
                <Flex justify="flex-start">
                  <Box borderWidth="1px" borderColor="gray.200" bg="gray.50" borderRadius="lg" px={3} py={2}>
                    <HStack>
                      <Spinner size="xs" />
                      <Text fontSize="sm" color="gray.600">
                        AI typing...
                      </Text>
                    </HStack>
                  </Box>
                </Flex>
              )}
            </Stack>

            <Divider my={4} />

            <Stack direction={{ base: 'column', sm: 'row' }}>
              <Input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder='Try: "We need a mid-level backend engineer with Node.js, MongoDB, and NestJS."'
                isDisabled={state === 'generating_job' || state === 'generating_post' || !activeThreadId}
              />
              <Button
                colorScheme="blue"
                onClick={() => void handleGenerate()}
                isDisabled={!prompt.trim() || state === 'generating_job' || state === 'generating_post' || !activeThreadId}
                leftIcon={state === 'generating_job' ? <Spinner size="xs" /> : undefined}
              >
                Send
              </Button>
            </Stack>
          </Box>

          <Box borderWidth="1px" borderRadius="lg" bg="white" p={4}>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Job Offer Preview</Heading>
              <HStack>
                {jobOffer && (
                  <Tooltip label="Copy generated job offer">
                    <IconButton aria-label="Copy job offer" icon={<CopyIcon />} size="sm" onClick={() => void copyJobOfferSummary()} />
                  </Tooltip>
                )}
                {(state === 'approved' || state === 'done') && (
                  <Tooltip label="Open LinkedIn feed">
                    <IconButton
                      aria-label="Open LinkedIn feed"
                      icon={<ExternalLinkIcon />}
                      size="sm"
                      onClick={() => window.open(linkedinFeedUrl, '_blank', 'noopener,noreferrer')}
                    />
                  </Tooltip>
                )}
              </HStack>
            </HStack>

            {!jobOffer ? (
              <Text color="gray.500">No generated job offer yet. Start from the chat panel.</Text>
            ) : (
              <Stack spacing={4}>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Title
                  </Text>
                  <Text fontWeight="semibold">{jobOffer.title}</Text>
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Seniority
                  </Text>
                  <Badge colorScheme="teal">{jobOffer.seniorityLevel}</Badge>
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>
                    Description
                  </Text>
                  <Text>{jobOffer.description}</Text>
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>
                    Required Skills
                  </Text>
                  <Flex wrap="wrap" gap={2}>
                    {jobOffer.requiredSkills.map((skill) => (
                      <Badge key={skill} colorScheme="blue">
                        {skill}
                      </Badge>
                    ))}
                  </Flex>
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>
                    Responsibilities
                  </Text>
                  <UnorderedList pl={5}>
                    {jobOffer.responsibilities.map((item) => (
                      <ListItem key={item}>{item}</ListItem>
                    ))}
                  </UnorderedList>
                </Box>

                {jobOffer.niceToHave.length > 0 && (
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={1}>
                      Nice to Have
                    </Text>
                    <UnorderedList pl={5}>
                      {jobOffer.niceToHave.map((item) => (
                        <ListItem key={item}>{item}</ListItem>
                      ))}
                    </UnorderedList>
                  </Box>
                )}

                <Stack direction={{ base: 'column', sm: 'row' }}>
                  {state === 'job_ready' && (
                    <Button colorScheme="green" onClick={handleApprove}>
                      Approve Job Offer
                    </Button>
                  )}

                  {(state === 'approved' || state === 'generating_post' || state === 'done') && (
                    <Button
                      colorScheme="purple"
                      onClick={() => void handleGeneratePost()}
                      isDisabled={state === 'generating_post'}
                      leftIcon={state === 'generating_post' ? <Spinner size="xs" /> : undefined}
                    >
                      Generate Post
                    </Button>
                  )}
                </Stack>

                {linkedinPost && (
                  <Box>
                    <Divider my={2} />
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" color="gray.500">
                        LinkedIn Post
                      </Text>
                      <IconButton
                        aria-label="Copy LinkedIn post"
                        icon={<CopyIcon />}
                        size="xs"
                        onClick={() => void copyText(linkedinPost, 'LinkedIn post')}
                      />
                    </HStack>
                    <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                      <Text whiteSpace="pre-wrap">{linkedinPost}</Text>
                    </Box>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        </Grid>
      </Stack>
    </Flex>
  );
};

export default RecruitmentPage;
