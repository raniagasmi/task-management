import { Badge, Box, Flex, IconButton, Menu, MenuButton, MenuItem, MenuList, Stack, Text } from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { CollaborationConversation } from '../../services/collaboration.service';
type ConversationPreferences = {
  pinned: string[];
  muted: string[];
  archived: string[];
  deleted: string[];
  followed: string[];
};

interface ConversationListProps {
  conversations: CollaborationConversation[];
  preferences: ConversationPreferences;
  selectedConversationId: string;
  onSelectConversation: (conversation: CollaborationConversation) => void;
  onAction: (action: 'pin' | 'mute' | 'archive' | 'delete' | 'follow' | 'unfollow', conversation: CollaborationConversation) => void;
}

const formatPreview = (value?: string) => {
  if (!value) {
    return 'No messages yet';
  }

  return value.length > 72 ? `${value.slice(0, 72).trimEnd()}...` : value;
};

const ConversationList = ({
  conversations,
  preferences,
  selectedConversationId,
  onSelectConversation,
  onAction,
}: ConversationListProps) => {
  return (
    <Stack spacing={3}>
      {conversations.length === 0 ? (
        <Box borderRadius="xl" bg="whiteAlpha.800" p={4} borderWidth="1px" borderColor="whiteAlpha.400">
          <Text fontWeight="600" color="slate.700">
            No conversations yet
          </Text>
          <Text color="slate.500" fontSize="sm" mt={1}>
            Create one from the AI button to start collaborating.
          </Text>
        </Box>
      ) : (
        conversations.map((conversation) => {
          const conversationId = conversation.id ?? conversation._id ?? '';
          const isSelected = conversationId === selectedConversationId;
          const isPinned = preferences.pinned.includes(conversationId);
          const isMuted = preferences.muted.includes(conversationId);
          const isFollowed = preferences.followed.includes(conversationId);

          return (
            <Box
              key={conversationId}
              onClick={() => onSelectConversation(conversation)}
              cursor="pointer"
              borderRadius="xl"
              p={4}
              bg={isSelected ? 'rgba(13,148,136,0.12)' : 'whiteAlpha.800'}
              borderWidth="1px"
              borderColor={isSelected ? 'teal.300' : isFollowed ? 'blue.200' : 'whiteAlpha.500'}
              boxShadow={isSelected ? '0 12px 28px rgba(15, 23, 42, 0.12)' : 'sm'}
              transition="all 0.2s ease"
              _hover={{ transform: 'translateY(-1px)', borderColor: isFollowed ? 'blue.300' : 'teal.200' }}
            >
              <Flex justify="space-between" align="flex-start" gap={3}>
                <Box>
                  <Flex align="center" gap={2}>
                    {isPinned && <Badge colorScheme="purple">Pinned</Badge>}
                    {isFollowed && <Badge colorScheme="blue">Following</Badge>}
                    {isMuted && <Badge colorScheme="gray">Muted</Badge>}
                    <Text fontWeight="700" color="#0f172a" noOfLines={1}>
                      {conversation.title}
                    </Text>
                  </Flex>
                  <Text color="slate.500" fontSize="sm" mt={1} noOfLines={2}>
                    {formatPreview(conversation.lastMessage)}
                  </Text>
                </Box>

                <Flex align="center" gap={2}>
                  {(conversation.unreadCount ?? 0) > 0 && (
                    <Badge colorScheme="pink" borderRadius="full" px={2}>
                      {conversation.unreadCount}
                    </Badge>
                  )}
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      aria-label="Conversation actions"
                      icon={<HamburgerIcon />}
                      size="xs"
                      variant="ghost"
                      onClick={(event) => event.stopPropagation()}
                    />
                    <MenuList onClick={(event) => event.stopPropagation()}>
                      <MenuItem onClick={() => onAction('pin', conversation)}>
                        {isPinned ? 'Unpin conversation' : 'Pin conversation'}
                      </MenuItem>
                      <MenuItem onClick={() => onAction(isFollowed ? 'unfollow' : 'follow', conversation)}>
                        {isFollowed ? 'Unfollow thread' : 'Follow thread'}
                      </MenuItem>
                      <MenuItem onClick={() => onAction('mute', conversation)}>
                        {isMuted ? 'Unmute conversation' : 'Mute conversation'}
                      </MenuItem>
                      <MenuItem onClick={() => onAction('archive', conversation)}>
                        Archive conversation
                      </MenuItem>
                      <MenuItem color="red.500" onClick={() => onAction('delete', conversation)}>
                        Delete conversation
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Flex>
              </Flex>
            </Box>
          );
        })
      )}
    </Stack>
  );
};

export default ConversationList;
