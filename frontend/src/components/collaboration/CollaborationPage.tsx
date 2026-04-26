import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Spinner,
  Stack,
  Switch,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import SideNavbar from '../layout/SideNavbar';
import { authService } from '../../services/auth.service';
import { userService } from '../../services/user.service';
import { User, UserRole } from '../../types/user';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import CreateConversationModal from './CreateConversationModal';
import {
  AiDecomposeResponse,
  CollaborationConversation,
  CollaborationMessage,
  CollaborationTaskProposal,
  CreateConversationPayload,
  collaborationService,
} from '../../services/collaboration.service';
import { collaborationSocket } from '../../services/collaboration.socket';
import { workspacePreferencesService } from '../../services/workspace-preferences.service';
import { ProductivitySettingsDrawer } from '../settings/ProductivitySettingsDrawer';

const seenKey = (conversationId: string) => `collaboration:lastSeen:${conversationId}`;

const toConversationId = (conversation: CollaborationConversation) => conversation.id ?? conversation._id ?? '';

const toMessageId = (message: CollaborationMessage) => message.id ?? message._id ?? `${message.conversationId}-${message.timestamp ?? message.content}`;

const toProposalId = (proposal: CollaborationTaskProposal) => proposal.id ?? proposal._id ?? `${proposal.conversationId}-${proposal.title}-${proposal.assignedTo}`;

type ConversationPreferences = {
  pinned: string[];
  muted: string[];
  archived: string[];
  deleted: string[];
};

const emptyPreferences = (): ConversationPreferences => ({
  pinned: [],
  muted: [],
  archived: [],
  deleted: [],
});

const preferenceKey = (userId?: string) => `collaboration:preferences:${userId ?? 'anonymous'}`;

const CollaborationPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const createModal = useDisclosure();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<CollaborationConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [proposals, setProposals] = useState<CollaborationTaskProposal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);
  const [typingLabel, setTypingLabel] = useState('');
  const [conversationPreferences, setConversationPreferences] = useState<ConversationPreferences>(emptyPreferences);
  const [showArchivedConversations, setShowArchivedConversations] = useState(false);
  const [followedThreads, setFollowedThreads] = useState<string[]>(workspacePreferencesService.getPreferences().collaboration.followedThreads);
  const [savedReplies, setSavedReplies] = useState<string[]>(workspacePreferencesService.getPreferences().collaboration.savedReplies);
  const selectedConversationIdRef = useRef('');
  const currentUserIdRef = useRef('');
  const usersByIdRef = useRef<Record<string, User>>({});

  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role?.toLowerCase() === UserRole.ADMIN;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(preferenceKey(currentUser?.id));
      setConversationPreferences(stored ? JSON.parse(stored) as ConversationPreferences : emptyPreferences());
    } catch {
      setConversationPreferences(emptyPreferences());
    }
  }, [currentUser?.id]);

  useEffect(() => {
    localStorage.setItem(preferenceKey(currentUser?.id), JSON.stringify(conversationPreferences));
  }, [conversationPreferences, currentUser?.id]);

  useEffect(() => {
    const preferences = workspacePreferencesService.getPreferences();
    setFollowedThreads(preferences.collaboration.followedThreads);
    setSavedReplies(preferences.collaboration.savedReplies);
  }, [currentUser?.id]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? '';
  }, [currentUser?.id]);

  const updateConversationPreference = (
    key: keyof ConversationPreferences,
    conversationId: string,
    enabled?: boolean,
  ) => {
    setConversationPreferences((prev) => {
      const exists = prev[key].includes(conversationId);
      const shouldEnable = enabled ?? !exists;
      return {
        ...prev,
        [key]: shouldEnable
          ? Array.from(new Set([...prev[key], conversationId]))
          : prev[key].filter((item) => item !== conversationId),
      };
    });
  };

  useEffect(() => {
    const socket = collaborationSocket.connect();

    const removeNewMessage = collaborationSocket.onNewMessage((message) => {
      if (message.conversationId !== selectedConversationIdRef.current) {
        if (
          followedThreads.includes(message.conversationId) &&
          workspacePreferencesService.shouldDeliver('collaboration')
        ) {
          toast({
            title: 'Followed thread update',
            description: message.content,
            status: 'info',
            duration: 3000,
            isClosable: true,
          });
        }
        setConversations((prev) =>
          prev.map((item) => {
            const conversationId = toConversationId(item);
            if (conversationId !== message.conversationId) {
              return item;
            }

            const nextUnread = (item.unreadCount ?? 0) + 1;
            return {
              ...item,
              lastMessage: message.content,
              lastMessageAt: message.timestamp ?? new Date().toISOString(),
              unreadCount: nextUnread,
            };
          }),
        );
        return;
      }

      setMessages((prev) => {
        const next = prev.some((item) => toMessageId(item) === toMessageId(message)) ? prev : [...prev, message];
        return next;
      });
      setTypingLabel('');
      setConversations((prev) =>
        prev.map((item) =>
          toConversationId(item) === message.conversationId
            ? {
                ...item,
                lastMessage: message.content,
                lastMessageAt: message.timestamp ?? new Date().toISOString(),
                unreadCount: 0,
              }
            : item,
        ),
      );
      localStorage.setItem(seenKey(message.conversationId), new Date().toISOString());
    });

    const removeAiGenerated = collaborationSocket.onAiGeneratedTasks((payload) => {
      if (!payload.conversationId || payload.conversationId !== selectedConversationIdRef.current) {
        return;
      }

      const aiResponse = payload as AiDecomposeResponse & { conversationId: string };
      if (aiResponse.proposals?.length) {
        setProposals(aiResponse.proposals);
      }

      setIsAiThinking(false);
      setTypingLabel('');
      void refreshConversationList(selectedConversationIdRef.current);
      setMessages((prev) => {
        const aiMessage: CollaborationMessage = {
          conversationId: aiResponse.conversationId,
          senderId: 'ai',
          senderType: 'AI',
          content: 'AI generated task proposals are ready for review.',
          timestamp: new Date().toISOString(),
        };

        if (prev.some((item) => item.content === aiMessage.content && item.senderType === 'AI')) {
          return prev;
        }

        return [...prev, aiMessage];
      });
    });

    const removeTaskAssigned = collaborationSocket.onTaskAssigned((payload) => {
      const assignedTo = String(payload.assignedTo ?? payload.proposal?.assignedTo ?? '');
      if (assignedTo && assignedTo === String(currentUserIdRef.current)) {
        toast({
          title: 'Task assigned successfully',
          description: 'A proposal was approved and converted into a task.',
          status: 'success',
          duration: 3500,
          isClosable: true,
        });
      }
      void refreshConversationList(selectedConversationIdRef.current);
    });

    const removeConversationNew = collaborationSocket.onConversationNew((payload) => {
      void refreshConversationList();

      const incomingConversationId = payload.conversationId ?? '';
      if (!incomingConversationId || selectedConversationIdRef.current) {
        return;
      }

      setSelectedConversationId(incomingConversationId);
      void collaborationService.getMessages(incomingConversationId).then(setMessages).catch(() => {
        setMessages([]);
      });
      setProposals(collaborationService.getCachedProposals(incomingConversationId));
      collaborationSocket.joinConversation(incomingConversationId);
      localStorage.setItem(seenKey(incomingConversationId), new Date().toISOString());
    });

    const removeTypingStart = collaborationSocket.onTypingStart((payload) => {
      if (payload.conversationId === selectedConversationIdRef.current && payload.userId !== currentUserIdRef.current) {
        const user = usersByIdRef.current[payload.userId];
        const name = user ? `${user.firstName} ${user.lastName}`.trim() : 'User';
        setTypingLabel(`${name} is typing...`);
      }
    });

    const removeTypingStop = collaborationSocket.onTypingStop((payload) => {
      if (payload.conversationId === selectedConversationIdRef.current && payload.userId !== currentUserIdRef.current) {
        setTypingLabel('');
      }
    });

    const removePresenceUpdated = collaborationSocket.onPresenceUpdated((payload) => {
      setUsers((prev) =>
        prev.map((user) => (user.id === payload.userId ? { ...user, presenceStatus: payload.status } : user)),
      );
    });

    return () => {
      removeNewMessage();
      removeAiGenerated();
      removeTaskAssigned();
      removeConversationNew();
      removeTypingStart();
      removeTypingStop();
      removePresenceUpdated();
      socket.disconnect();
    };
  }, [followedThreads, toast]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const allConversations = await collaborationService.getUserConversations();

        if (isAdmin) {
          try {
            const allUsers = await userService.getAllUsers();
            setUsers(allUsers);
          } catch (usersError) {
            console.error('Failed to load users for collaboration:', usersError);
            setUsers([]);
          }
        } else {
          setUsers([]);
        }

        const enriched = await Promise.all(
          allConversations.map(async (conversation) => {
            const conversationId = toConversationId(conversation);
            const conversationMessages = await collaborationService.getMessages(conversationId).catch(() => []);
            const lastMessage = conversationMessages.at(-1);
            const lastSeen = localStorage.getItem(seenKey(conversationId));

            const unreadCount = conversationMessages.filter((message) => {
              if (!lastSeen || !message.timestamp) {
                return false;
              }

              return new Date(message.timestamp).getTime() > new Date(lastSeen).getTime();
            }).length;

            return {
              ...conversation,
              lastMessage: lastMessage?.content,
              unreadCount,
            };
          }),
        );

        setConversations(enriched);
        enriched.forEach((conversation) => {
          const conversationId = toConversationId(conversation);
          if (conversationId) {
            collaborationSocket.joinConversation(conversationId);
          }
        });

        const firstConversation = enriched[0];
        if (firstConversation) {
          const firstConversationId = toConversationId(firstConversation);
          setSelectedConversationId(firstConversationId);
          const initialMessages = await collaborationService.getMessages(firstConversationId);
          setMessages(initialMessages);
          setProposals(collaborationService.getCachedProposals(firstConversationId));
          localStorage.setItem(seenKey(firstConversationId), new Date().toISOString());
          collaborationSocket.joinConversation(firstConversationId);
        }
      } catch (error) {
        console.error('Failed to load collaboration data:', error);
        toast({
          title: 'Failed to load collaboration workspace',
          status: 'error',
          duration: 3500,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAdmin, toast]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    collaborationSocket.joinConversation(selectedConversationId);
    setConversations((prev) =>
      prev.map((conversation) =>
        toConversationId(conversation) === selectedConversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );
    localStorage.setItem(seenKey(selectedConversationId), new Date().toISOString());

    return () => {
      collaborationSocket.leaveConversation(selectedConversationId);
    };
  }, [selectedConversationId]);

  const usersById = useMemo(() => {
    const entries = new Map<string, User>();
    const register = (user?: Partial<User> & { id?: string }) => {
      if (!user?.id) {
        return;
      }

      entries.set(user.id, {
        id: user.id,
        email: user.email ?? '',
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        role: (user.role ?? UserRole.EMPLOYEE) as UserRole,
        isActive: user.isActive ?? true,
        presenceStatus: user.presenceStatus,
        createdAt: user.createdAt ?? '',
        updatedAt: user.updatedAt ?? '',
      });
    };

    users.forEach(register);
    register(currentUser ?? undefined);
    conversations.forEach((conversation) => {
      register(conversation.admin);
      conversation.members?.forEach(register);
      conversation.participants?.forEach((participant) => register(participant.user));
    });
    messages.forEach((message) => register(message.sender));
    proposals.forEach((proposal) => register(proposal.assignee));

    return Object.fromEntries(entries.entries());
  }, [conversations, currentUser, messages, proposals, users]);

  useEffect(() => {
    usersByIdRef.current = usersById;
  }, [usersById]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => toConversationId(conversation) === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const visibleConversations = useMemo(() => {
    const deleted = new Set(conversationPreferences.deleted);
    const archived = new Set(conversationPreferences.archived);
    const pinned = new Set(conversationPreferences.pinned);

    return conversations
      .filter((conversation) => !deleted.has(toConversationId(conversation)))
      .filter((conversation) => showArchivedConversations || !archived.has(toConversationId(conversation)))
      .sort((left, right) => {
        const leftId = toConversationId(left);
        const rightId = toConversationId(right);
        const leftPinned = pinned.has(leftId) ? 1 : 0;
        const rightPinned = pinned.has(rightId) ? 1 : 0;
        if (leftPinned !== rightPinned) {
          return rightPinned - leftPinned;
        }

        return new Date(right.lastMessageAt ?? 0).getTime() - new Date(left.lastMessageAt ?? 0).getTime();
      });
  }, [conversationPreferences.archived, conversationPreferences.deleted, conversationPreferences.pinned, conversations, showArchivedConversations]);

  const archivedConversationCount = useMemo(
    () => conversations.filter((conversation) => conversationPreferences.archived.includes(toConversationId(conversation))).length,
    [conversationPreferences.archived, conversations],
  );

  const employeePendingProposalCount = useMemo(
    () => conversations.reduce((total, conversation) => total + (conversation.pendingAssignedProposalCount ?? 0), 0),
    [conversations],
  );

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const refreshConversationList = async (conversationId?: string) => {
    const allConversations = await collaborationService.getUserConversations();
    const enriched = await Promise.all(
      allConversations.map(async (conversation) => {
        const id = toConversationId(conversation);
        const cachedLastMessage = conversation.lastMessage;
        const lastMessage = cachedLastMessage
          ? cachedLastMessage
          : (await collaborationService.getMessages(id).catch(() => [])).at(-1)?.content;

        return {
          ...conversation,
          lastMessage,
          unreadCount: conversationId && id === conversationId ? 0 : conversation.unreadCount ?? 0,
        };
      }),
    );

    setConversations(enriched);
    enriched.forEach((conversation) => {
      const id = toConversationId(conversation);
      if (id) {
        collaborationSocket.joinConversation(id);
      }
    });
  };

  const handleConversationAction = (
    action: 'pin' | 'mute' | 'archive' | 'delete',
    conversation: CollaborationConversation,
  ) => {
    const conversationId = toConversationId(conversation);
    if (!conversationId) {
      return;
    }

    const key =
      action === 'pin'
        ? 'pinned'
        : action === 'mute'
          ? 'muted'
          : action === 'archive'
            ? 'archived'
            : 'deleted';
    updateConversationPreference(key, conversationId);

    if ((action === 'archive' || action === 'delete') && selectedConversationId === conversationId) {
      setSelectedConversationId('');
      setMessages([]);
      setProposals([]);
    }
  };

  const handleSelectConversation = async (conversation: CollaborationConversation) => {
    const conversationId = toConversationId(conversation);
    setSelectedConversationId(conversationId);
    setMessages(await collaborationService.getMessages(conversationId));
    setProposals(collaborationService.getCachedProposals(conversationId));
    collaborationSocket.joinConversation(conversationId);
    localStorage.setItem(seenKey(conversationId), new Date().toISOString());
    setConversations((prev) =>
      prev.map((item) =>
        toConversationId(item) === conversationId ? { ...item, unreadCount: 0 } : item,
      ),
    );
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversationId) {
      return;
    }

    try {
      setIsSending(true);
      const message = await collaborationService.sendMessage(selectedConversationId, content);
      setMessages((prev) => [...prev, message]);
      await refreshConversationList(selectedConversationId);
    } catch (error) {
      console.error('Failed to send collaboration message:', error);
      toast({
        title: 'Message failed to send',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateConversation = async (payload: CreateConversationPayload) => {
    try {
      setIsModalSubmitting(true);
      setIsAiThinking(true);

      const response = await collaborationService.createConversation(payload);
      const conversationId = response.conversation.id ?? response.conversation._id ?? '';

      setConversations((prev) => [
        {
          ...response.conversation,
          lastMessage: response.tasks.length ? 'Conversation created and initial task proposals generated.' : response.conversation.lastMessage,
          unreadCount: 0,
        },
        ...prev.filter((conversation) => toConversationId(conversation) !== conversationId),
      ]);

        setSelectedConversationId(conversationId);
        const freshMessages = await collaborationService.getMessages(conversationId);
        setMessages(freshMessages);
        setProposals(response.proposals ?? collaborationService.getCachedProposals(conversationId));
        await refreshConversationList(conversationId);

      collaborationSocket.joinConversation(conversationId);
      localStorage.setItem(seenKey(conversationId), new Date().toISOString());

      toast({
        title: 'Conversation created',
        description: 'AI generated task proposals are ready for review.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      createModal.onClose();
    } catch (error) {
      console.error('Failed to create collaboration conversation:', error);
      toast({
        title: 'Conversation creation failed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsModalSubmitting(false);
      setIsAiThinking(false);
    }
  };

  const handleRegenerateAi = async () => {
    if (!selectedConversationId || !isAdmin) {
      return;
    }

      try {
        setIsAiThinking(true);
        const response = await collaborationService.aiDecompose(selectedConversationId);
        setProposals(response.proposals);
        await refreshConversationList(selectedConversationId);
        toast({
        title: 'AI tasks updated',
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to regenerate AI tasks:', error);
      toast({
        title: 'AI generation failed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleApproveAll = async () => {
    if (!selectedConversationId || !isAdmin) {
      return;
    }

      try {
        setIsAiThinking(true);
        const approved = await collaborationService.approveTasks(selectedConversationId);
        if (approved.length > 0) {
          setProposals([]);
          await refreshConversationList(selectedConversationId);
          toast({
          title: 'Tasks assigned successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Failed to approve proposals:', error);
      toast({
        title: 'Task approval failed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleApproveProposal = async (proposal: CollaborationTaskProposal) => {
    if (!selectedConversationId) {
      return;
    }

    try {
      const proposalId = toProposalId(proposal);
      const response = await collaborationService.approveProposal(proposalId, selectedConversationId);
      if (proposalId) {
        setProposals((prev) => prev.filter((item) => toProposalId(item) !== proposalId));
      }
      if (response.systemMessage) {
        setMessages((prev) =>
          prev.some((item) => toMessageId(item) === toMessageId(response.systemMessage!))
            ? prev
            : [...prev, response.systemMessage!],
        );
      }
      await refreshConversationList(selectedConversationId);

      toast({
        title: 'Task assigned successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to approve proposal:', error);
      toast({
        title: 'Approval failed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRejectProposal = async (proposal: CollaborationTaskProposal) => {
    if (!selectedConversationId) {
      return;
    }

    try {
      const proposalId = toProposalId(proposal);
      await collaborationService.rejectProposal(proposalId, selectedConversationId);
      setProposals((prev) => prev.filter((item) => toProposalId(item) !== proposalId));
      await refreshConversationList(selectedConversationId);
      toast({
        title: 'Proposal rejected',
        status: 'info',
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to reject proposal:', error);
      toast({
        title: 'Rejection failed',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleStartTyping = () => {
    if (!selectedConversationId || !currentUser?.id) {
      return;
    }

    collaborationSocket.startTyping(selectedConversationId, currentUser.id);
  };

  const handleStopTyping = () => {
    if (!selectedConversationId || !currentUser?.id) {
      return;
    }

    collaborationSocket.stopTyping(selectedConversationId, currentUser.id);
  };

  return (
    <Flex minH="100vh" bg="linear-gradient(180deg, #f8fbff 0%, #eef4ff 45%, #f7f7fb 100%)">
      <SideNavbar onLogoutClick={handleLogout} />

      <Box flex={1} px={{ base: 4, md: 6, xl: 8 }} py={{ base: 6, md: 8 }} maxW="1600px" mx="auto" w="full">
        <Stack spacing={3} mb={6}>
          <Badge alignSelf="flex-start" colorScheme="purple" borderRadius="full" px={3} py={1}>
            CollaborationChat
          </Badge>
          <Heading size="xl" color="#0f172a" letterSpacing="-0.03em">
            Real-time collaboration with AI task proposals
          </Heading>
          <Text color="slate.600" maxW="80ch">
            Chat with your team, generate structured work items, and approve tasks directly from the conversation.
          </Text>
        </Stack>

        {!isAdmin && employeePendingProposalCount > 0 && (
          <Flex
            position="sticky"
            top={4}
            zIndex={5}
            mb={4}
            borderRadius="2xl"
            px={5}
            py={3}
            bg="linear-gradient(135deg, rgba(15,118,110,0.95), rgba(14,165,233,0.9))"
            color="white"
            boxShadow="0 16px 30px rgba(15, 118, 110, 0.2)"
            justify="space-between"
            align="center"
            gap={3}
            wrap="wrap"
          >
            <Text fontWeight="700">
              You have {employeePendingProposalCount} pending task proposals to review
            </Text>
            <Badge bg="whiteAlpha.300" color="white" borderRadius="full" px={3} py={1}>
              Live count
            </Badge>
          </Flex>
        )}

        <Flex gap={6} align="stretch" h="calc(100vh - 170px)">
          <Box w={{ base: '100%', xl: '340px' }} flexShrink={0} display={{ base: selectedConversation ? 'none' : 'block', xl: 'block' }}>
            <Box bg="rgba(255,255,255,0.88)" backdropFilter="blur(16px)" borderRadius="3xl" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)" p={5} h="100%" overflow="hidden">
              <Flex justify="space-between" align="center" mb={4}>
                <Box>
                  <Text fontWeight="700" color="#0f172a">
                    Conversations
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    {visibleConversations.length} visible threads
                  </Text>
                </Box>
                <Flex align="center" gap={2}>
                  <Flex align="center" gap={2}>
                    <Text fontSize="xs" color="gray.500">Show archived</Text>
                    <Switch size="sm" isChecked={showArchivedConversations} onChange={(event) => setShowArchivedConversations(event.target.checked)} />
                  </Flex>
                  {archivedConversationCount > 0 && (
                    <Badge colorScheme="orange" borderRadius="full">{archivedConversationCount}</Badge>
                  )}
                  {isAdmin && (
                    <Button size="sm" colorScheme="purple" onClick={createModal.onOpen} leftIcon={<AddIcon />}>
                      New
                    </Button>
                  )}
                  <ProductivitySettingsDrawer />
                </Flex>
              </Flex>

              {loading ? (
                <Flex align="center" justify="center" h="60%">
                  <Spinner size="lg" color="teal.500" />
                </Flex>
              ) : (
                <ConversationList
                  conversations={visibleConversations}
                  preferences={conversationPreferences}
                  selectedConversationId={selectedConversationId}
                  onSelectConversation={handleSelectConversation}
                  onAction={handleConversationAction}
                />
              )}
            </Box>
          </Box>

          <Box flex={1} minW={0}>
            {loading ? (
              <Flex align="center" justify="center" h="100%" bg="white" borderRadius="3xl" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)">
                <Stack align="center" spacing={3}>
                  <Spinner size="xl" color="teal.500" />
                  <Text color="gray.500">Loading collaboration workspace...</Text>
                </Stack>
              </Flex>
            ) : (
              <ChatWindow
                conversation={selectedConversation}
                messages={messages}
                proposals={proposals}
                currentUser={currentUser}
                usersById={usersById}
                isAdmin={isAdmin}
                isSending={isSending}
                isAiThinking={isAiThinking}
                typingLabel={typingLabel}
                savedReplies={savedReplies}
                isFollowingThread={followedThreads.includes(selectedConversationId)}
                onSendMessage={handleSendMessage}
                onStartTyping={handleStartTyping}
                onStopTyping={handleStopTyping}
                onApproveAll={handleApproveAll}
                onApproveProposal={handleApproveProposal}
                onRejectProposal={handleRejectProposal}
                onManualAIGeneration={handleRegenerateAi}
                onToggleFollowThread={() => {
                  const next = followedThreads.includes(selectedConversationId)
                    ? followedThreads.filter((id) => id !== selectedConversationId)
                    : [...followedThreads, selectedConversationId];
                  setFollowedThreads(next);
                  const updated = workspacePreferencesService.updatePreferences((preferences) => ({
                    ...preferences,
                    collaboration: {
                      ...preferences.collaboration,
                      followedThreads: next,
                    },
                  }));
                  setSavedReplies(updated.collaboration.savedReplies);
                }}
              />
            )}
          </Box>
        </Flex>

        {isAdmin && (
          <IconButton
            aria-label="Open collaboration creator"
            icon={<AddIcon />}
            position="fixed"
            top={6}
            right={6}
            zIndex={20}
            size="lg"
            colorScheme="purple"
            boxShadow="0 16px 30px rgba(124, 58, 237, 0.35)"
            onClick={createModal.onOpen}
          />
        )}

        <CreateConversationModal
          isOpen={createModal.isOpen}
          isLoading={isModalSubmitting}
          users={users.filter((user) => user.id !== currentUser?.id)}
          onClose={createModal.onClose}
          onSubmit={handleCreateConversation}
        />
      </Box>
    </Flex>
  );
};

export default CollaborationPage;
