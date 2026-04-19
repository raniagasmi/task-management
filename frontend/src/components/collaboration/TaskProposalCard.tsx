import { Badge, Box, Button, Flex, Stack, Text } from '@chakra-ui/react';
import { CollaborationTaskProposal } from '../../services/collaboration.service';

interface TaskProposalCardProps {
  proposal: CollaborationTaskProposal;
  assigneeLabel: string;
  isAdmin: boolean;
  onApprove: (proposal: CollaborationTaskProposal) => void;
  onReject: (proposal: CollaborationTaskProposal) => void;
}

const priorityColors: Record<NonNullable<CollaborationTaskProposal['priority']>, string> = {
  LOW: 'green',
  MEDIUM: 'yellow',
  HIGH: 'red',
};

const TaskProposalCard = ({ proposal, assigneeLabel, isAdmin, onApprove, onReject }: TaskProposalCardProps) => {
  return (
    <Box borderWidth="1px" borderColor="whiteAlpha.500" borderRadius="2xl" p={4} bg="white">
      <Stack spacing={3}>
        <Flex justify="space-between" align="flex-start" gap={3}>
          <Box>
            <Text fontWeight="700" color="#0f172a">
              {proposal.title}
            </Text>
            <Text fontSize="sm" color="slate.600" mt={1} whiteSpace="pre-wrap">
              {proposal.description}
            </Text>
          </Box>
          <Badge colorScheme={priorityColors[proposal.priority]} borderRadius="full">
            {proposal.priority}
          </Badge>
        </Flex>

        <Flex justify="space-between" align="center" gap={3} wrap="wrap">
          <Text fontSize="sm" color="slate.500">
            Assigned to: <strong>{assigneeLabel}</strong>
          </Text>
          {proposal.status && (
            <Badge colorScheme={proposal.status === 'APPROVED' ? 'green' : proposal.status === 'REJECTED' ? 'red' : 'gray'}>
              {proposal.status}
            </Badge>
          )}
        </Flex>

        {isAdmin && (proposal.status ?? 'DRAFT') === 'DRAFT' && (
          <Flex gap={3} pt={1} wrap="wrap">
            <Button size="sm" colorScheme="green" onClick={() => onApprove(proposal)}>
              Approve
            </Button>
            <Button size="sm" colorScheme="red" variant="outline" onClick={() => onReject(proposal)}>
              Reject
            </Button>
          </Flex>
        )}
      </Stack>
    </Box>
  );
};

export default TaskProposalCard;
