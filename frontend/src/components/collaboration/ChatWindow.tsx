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
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { ArrowForwardIcon, RepeatIcon } from '@chakra-ui/icons';
import { CollaborationConversation, CollaborationMessage, CollaborationTaskProposal } from '../../services/collaboration.service';
import MessageBubble from './MessageBubble';
import TaskProposalCard from './TaskProposalCard';
import { User } from '../../types/user';

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
  onSendMessage: (content: string) => void;
  onApproveAll: () => void;
  onApproveProposal: (proposal: CollaborationTaskProposal) => void;
  onRejectProposal: (proposal: CollaborationTaskProposal) => void;
  onManualAIGeneration: () => void;
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
  onSendMessage,
  onApproveAll,
  onApproveProposal,
  onRejectProposal,
  onManualAIGeneration,
}: ChatWindowProps) => {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, proposals, isAiThinking, typingLabel]);

  const roomLabel = useMemo(() => {
    if (!conversation) {
      return 'Select a conversation to begin';
    }

    return conversation.title;
  }, [conversation]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content) {
      return;
    }

    onSendMessage(content);
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
                const user = usersById[participant.userId];
                return (
                  <Badge key={participant.userId} bg="whiteAlpha.200" color="white" borderRadius="full" px={3} py={1}>
                    {user ? `${user.firstName} ${user.lastName}` : participant.role}
                  </Badge>
                );
              })}
            </HStack>
          )}
        </Flex>
      </Box>

      <Flex flex={1} direction="column" minH={0}>
        <Box ref={scrollRef} flex={1} overflowY="auto" px={6} py={5} bg="linear-gradient(180deg, #fbfdff 0%, #f4f8fb 100%)">
          <Stack spacing={4}>
            {messages.length === 0 ? (
              <Box borderWidth="1px" borderColor="gray.100" borderRadius="2xl" p={6} bg="white">
                <Text color="gray.500">No messages yet. Start the conversation or generate AI tasks.</Text>
              </Box>
            ) : (
              messages.map((message) => {
                const sender = usersById[message.senderId];
                const senderLabel =
                  message.senderType === 'AI'
                    ? 'AI'
                    : message.senderType === 'SYSTEM'
                      ? 'System'
                      : sender
                        ? `${sender.firstName} ${sender.lastName}`
                        : message.senderId;

                const isOwnMessage = message.senderId === currentUser?.id;

                return (
                  <Box key={message.id ?? message._id ?? `${message.conversationId}-${message.timestamp ?? message.content}`}> 
                    <MessageBubble message={message} isOwnMessage={isOwnMessage} senderLabel={senderLabel} />
                  </Box>
                );
              })
            )}

            {(isAiThinking || typingLabel) && (
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
                  <Text color="gray.600">{typingLabel ?? 'AI is thinking...'}</Text>
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
                    const assignee = usersById[proposal.assignedTo];
                    const assigneeLabel = assignee ? `${assignee.firstName} ${assignee.lastName}` : proposal.assignedTo;

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
          <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
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
