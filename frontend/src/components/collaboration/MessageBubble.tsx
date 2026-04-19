import { Avatar, Box, Flex, Text } from '@chakra-ui/react';
import { CollaborationMessage } from '../../services/collaboration.service';

interface MessageBubbleProps {
  message: CollaborationMessage;
  isOwnMessage: boolean;
  senderLabel: string;
}

const MessageBubble = ({ message, isOwnMessage, senderLabel }: MessageBubbleProps) => {
  if (message.senderType === 'SYSTEM') {
    return (
      <Flex justify="center" w="100%" py={1}>
        <Box
          bg="blackAlpha.50"
          borderRadius="full"
          px={4}
          py={2}
          maxW="80%"
          textAlign="center"
        >
          <Text fontSize="sm" color="gray.600">
            {message.content}
          </Text>
        </Box>
      </Flex>
    );
  }

  const isAiMessage = message.senderType === 'AI';

  return (
    <Flex justify={isOwnMessage ? 'flex-end' : 'flex-start'} w="100%">
      <Flex gap={3} align="flex-end" direction={isOwnMessage ? 'row-reverse' : 'row'} maxW="88%">
        <Avatar
          name={senderLabel}
          size="sm"
          bg={isAiMessage ? 'purple.500' : isOwnMessage ? 'teal.500' : 'gray.500'}
          color="white"
        />
        <Box
          px={4}
          py={3}
          borderRadius="2xl"
          bg={isAiMessage
            ? 'linear-gradient(135deg, rgba(124,58,237,0.95), rgba(14,165,233,0.92))'
            : isOwnMessage
              ? 'teal.500'
              : 'gray.100'}
          color={isAiMessage || isOwnMessage ? 'white' : 'gray.800'}
          boxShadow="0 10px 24px rgba(15, 23, 42, 0.08)"
          borderWidth={isAiMessage ? '0' : '1px'}
          borderColor={isOwnMessage ? 'teal.400' : 'gray.200'}
          transition="transform 0.2s ease, opacity 0.2s ease"
        >
          <Text fontSize="xs" fontWeight="700" textTransform="uppercase" opacity={0.82} mb={1}>
            {senderLabel}
          </Text>
          <Text whiteSpace="pre-wrap" lineHeight="1.55">
            {message.content}
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
};

export default MessageBubble;
