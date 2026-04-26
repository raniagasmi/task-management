import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Heading,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Stack,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { ArrowForwardIcon, ChevronDownIcon, RepeatIcon, SearchIcon, StarIcon } from '@chakra-ui/icons';
import { CollaborationConversation, CollaborationMessage, CollaborationTaskProposal } from '../../services/collaboration.service';
import MessageBubble from './MessageBubble';
import TaskProposalCard from './TaskProposalCard';
import { User } from '../../types/user';
import { AvailabilityBadge } from '../shared/AvailabilityBadge';

interface ChatWindowProps {
  conversation?: CollaborationConversation | null;
  messages: CollaborationMessage[];
  proposals: CollaborationTaskProposal[];
  currentUser: User | null;
  usersById: Record<string, User>;
  isAdmin: boolean;
  isSending: boolean;
  isAiThinking: boolean;
  typingLabel?: string;
  savedReplies: string[];
  isFollowingThread: boolean;
  onSendMessage: (content: string) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  onApproveAll: () => void;
  onApproveProposal: (proposal: CollaborationTaskProposal) => void;
  onRejectProposal: (proposal: CollaborationTaskProposal) => void;
  onManualAIGeneration: () => void;
  onToggleFollowThread: () => void;
}

const ChatWindow = ({
  conversation,
  messages,
  proposals,
  currentUser,
  usersById,
  isAdmin,
  isSending,
  isAiThinking,
  typingLabel,
  savedReplies,
  isFollowingThread,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  onApproveAll,
  onApproveProposal,
  onRejectProposal,
  onManualAIGeneration,
  onToggleFollowThread,
}: ChatWindowProps) => {
  const [draft, setDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, proposals, isAiThinking, typingLabel]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    onStopTyping();
  }, [onStopTyping]);

  const roomLabel = useMemo(() => {
    if (!conversation) {
      return 'Select a conversation to begin';
    }

    return conversation.title;
  }, [conversation]);

  const filteredMessages = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return messages;
    }

    return messages.filter((message) => {
      const sender = usersById[message.senderId] ?? message.sender;
      const senderName = sender ? `${sender.firstName} ${sender.lastName}`.toLowerCase() : '';
      return (
        message.content.toLowerCase().includes(query) ||
        senderName.includes(query) ||
        (message.metadata?.taskTitle ?? '').toLowerCase().includes(query)
      );
    });
  }, [messages, searchTerm, usersById]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content) {
      return;
    }

    onSendMessage(content);
    onStopTyping();
    setDraft('');
  };

  return (
    <Flex direction="column" h="100%" bg="white" borderRadius="3xl" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)" overflow="hidden">
      <Box px={6} py={5} borderBottom="1px solid" borderColor="gray.100" bg="linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,118,110,0.88))" color="white">
        <Flex justify="space-between" align="center" gap={4} wrap="wrap">
          <Box>
            <Badge colorScheme="teal" borderRadius="full" px={3} py={1} mb={2}>
              CollaborationChat
            </Badge>
            <Heading size="md" letterSpacing="-0.02em">
              {roomLabel}
            </Heading>
            <Text opacity={0.86} mt={1}>
              {conversation ? 'Real-time chat with AI-generated task proposals.' : 'Pick a conversation from the sidebar.'}
            </Text>
          </Box>

          {conversation && (
            <HStack spacing={2}>
              {conversation.participants?.slice(0, 3).map((participant) => {
                const user = usersById[participant.userId] ?? participant.user;
                return (
                  <Tooltip
                    key={participant.userId}
                    label={user ? `${user.firstName} ${user.lastName}` : participant.fullName ?? participant.role}
                  >
                    <HStack bg="whiteAlpha.200" borderRadius="full" px={3} py={1} spacing={2}>
                      <Text fontSize="sm">
                        {user ? `${user.firstName} ${user.lastName}` : participant.fullName ?? participant.role}
                      </Text>
                      <AvailabilityBadge status={user?.presenceStatus} />
                    </HStack>
                  </Tooltip>
                );
              })}
              <Button
                size="sm"
                variant={isFollowingThread ? 'solid' : 'outline'}
                colorScheme="teal"
                leftIcon={<StarIcon />}
                onClick={onToggleFollowThread}
              >
                {isFollowingThread ? 'Following' : 'Follow thread'}
              </Button>
            </HStack>
          )}
        </Flex>
      </Box>

      <Flex flex={1} direction="column" minH={0}>
        <Box ref={scrollRef} flex={1} overflowY="auto" px={6} py={5} bg="linear-gradient(180deg, #fbfdff 0%, #f4f8fb 100%)">
          <HStack mb={4}>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search messages, people, or task mentions"
              bg="white"
            />
            <IconButton aria-label="Search messages" icon={<SearchIcon />} />
          </HStack>
          <Stack spacing={4}>
            {filteredMessages.length === 0 ? (
              <Box borderWidth="1px" borderColor="gray.100" borderRadius="2xl" p={6} bg="white">
                <Text color="gray.500">
                  {searchTerm ? 'No messages matched your search.' : 'No messages yet. Start the conversation or generate AI tasks.'}
                </Text>
              </Box>
            ) : (
              filteredMessages.map((message) => {
                const sender = usersById[message.senderId] ?? message.sender;
                const senderLabel =
                  message.senderType === 'AI'
                    ? 'AI'
                    : message.senderType === 'SYSTEM'
                      ? 'System'
                      : sender
                        ? `${sender.firstName} ${sender.lastName}`
                        : message.sender?.fullName ?? message.senderId;

                const isOwnMessage = message.senderId === currentUser?.id;

                return (
                  <Box key={message.id ?? message._id ?? `${message.conversationId}-${message.timestamp ?? message.content}`}> 
                    <MessageBubble message={message} isOwnMessage={isOwnMessage} senderLabel={senderLabel} />
                  </Box>
                );
              })
            )}

            {isAiThinking && (
              <Box
                alignSelf="flex-start"
                bg="white"
                borderWidth="1px"
                borderColor="purple.100"
                borderRadius="full"
                px={4}
                py={2}
                boxShadow="sm"
              >
                <HStack spacing={2}>
                  <Spinner size="sm" color="purple.500" />
                  <Text color="gray.600">AI is generating proposals...</Text>
                </HStack>
              </Box>
            )}

            {typingLabel && (
              <Box
                alignSelf="flex-start"
                bg="white"
                borderWidth="1px"
                borderColor="teal.100"
                borderRadius="full"
                px={4}
                py={2}
                boxShadow="sm"
              >
                <HStack spacing={2}>
                  <Spinner size="sm" color="teal.500" />
                  <Text color="gray.600">{typingLabel}</Text>
                </HStack>
              </Box>
            )}

            {proposals.length > 0 && (
              <Box pt={2}>
                <Flex justify="space-between" align="center" mb={3} wrap="wrap" gap={3}>
                  <Box>
                    <Badge colorScheme={isAdmin ? 'purple' : 'gray'} borderRadius="full" px={3} py={1}>
                      AI task proposals
                    </Badge>
                    <Text mt={2} color="gray.600">
                      Review the generated tasks before they are assigned.
                    </Text>
                  </Box>

                  {isAdmin && (
                    <HStack>
                      <Button size="sm" colorScheme="teal" onClick={onApproveAll} leftIcon={<ArrowForwardIcon />}>
                        Approve All Tasks
                      </Button>
                      <IconButton
                        aria-label="Regenerate AI tasks"
                        size="sm"
                        variant="outline"
                        colorScheme="purple"
                        icon={<RepeatIcon />}
                        onClick={onManualAIGeneration}
                      />
                    </HStack>
                  )}
                </Flex>

                <Stack spacing={3}>
                  {proposals.map((proposal) => {
                    const assignee = usersById[proposal.assignedTo] ?? proposal.assignee;
                    const assigneeLabel = assignee ? `${assignee.firstName} ${assignee.lastName}` : proposal.assignee?.fullName ?? proposal.assignedTo;

                    return (
                      <TaskProposalCard
                        key={proposal.id ?? proposal._id ?? `${proposal.title}-${proposal.assignedTo}`}
                        proposal={proposal}
                        assigneeLabel={assigneeLabel}
                        isAdmin={isAdmin}
                        onApprove={onApproveProposal}
                        onReject={onRejectProposal}
                      />
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>

        <Divider />

        <Box px={6} py={5} bg="white">
          <HStack mb={3} justify="space-between" wrap="wrap">
            <Text fontSize="sm" color="slate.500">Saved replies</Text>
            <Menu>
              <MenuButton as={Button} size="sm" rightIcon={<ChevronDownIcon />} variant="outline">
                Insert snippet
              </MenuButton>
              <MenuList>
                {savedReplies.map((reply) => (
                  <MenuItem key={reply} onClick={() => setDraft((prev) => (prev ? `${prev} ${reply}` : reply))}>
                    {reply}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </HStack>
          <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
            <Input
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (event.target.value.trim()) {
                  onStartTyping();
                  if (typingTimeoutRef.current) {
                    window.clearTimeout(typingTimeoutRef.current);
                  }
                  typingTimeoutRef.current = window.setTimeout(() => {
                    onStopTyping();
                    typingTimeoutRef.current = null;
                  }, 1200);
                } else {
                  onStopTyping();
                }
              }}
              placeholder="Write a message..."
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              isDisabled={!conversation || isSending}
            />
            <Button
              colorScheme="teal"
              onClick={handleSend}
              isDisabled={!conversation || !draft.trim() || isSending}
              leftIcon={isSending ? <Spinner size="xs" /> : undefined}
            >
              Send
            </Button>
          </Stack>
        </Box>
      </Flex>
    </Flex>
  );
};

export default ChatWindow;
