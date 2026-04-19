import { Badge, Box, Flex, Stack, Text } from '@chakra-ui/react';
import { CollaborationConversation } from '../../services/collaboration.service';

interface ConversationListProps {
  conversations: CollaborationConversation[];
  selectedConversationId: string;
  onSelectConversation: (conversation: CollaborationConversation) => void;
}

const formatPreview = (value?: string) => {
  if (!value) {
    return 'No messages yet';
  }

  return value.length > 72 ? `${value.slice(0, 72).trimEnd()}...` : value;
};

const ConversationList = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
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

          return (
            <Box
              key={conversationId}
              onClick={() => onSelectConversation(conversation)}
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
                <Box>
                  <Text fontWeight="700" color="#0f172a" noOfLines={1}>
                    {conversation.title}
                  </Text>
                  <Text color="slate.500" fontSize="sm" mt={1} noOfLines={2}>
                    {formatPreview(conversation.lastMessage)}
                  </Text>
                </Box>

                {(conversation.unreadCount ?? 0) > 0 && (
                  <Badge colorScheme="pink" borderRadius="full" px={2}>
                    {conversation.unreadCount}
                  </Badge>
                )}
              </Flex>
            </Box>
          );
        })
      )}
    </Stack>
  );
};

export default ConversationList;
