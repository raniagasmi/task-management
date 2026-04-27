import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { Task as TaskType } from '../../types/task';

export type TaskDecision = 'accepted' | 'declined';

export interface TaskActionComment {
  id: string;
  content: string;
  createdAt: string;
}

interface TaskActionPanelProps {
  isOpen: boolean;
  task: TaskType | null;
  comments: TaskActionComment[];
  decision: TaskDecision | null;
  onClose: () => void;
  onAddComment: (comment: string) => void;
  onAccept: () => void;
  onDecline: () => void;
}

const TaskActionPanel = ({
  isOpen,
  task,
  comments,
  decision,
  onClose,
  onAddComment,
  onAccept,
  onDecline,
}: TaskActionPanelProps) => {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setDraft('');
    }
  }, [isOpen, task?.id]);

  const handleComment = () => {
    const message = draft.trim();
    if (!message) {
      return;
    }

    onAddComment(message);
    setDraft('');
  };

  const dueDate = task?.dueDate ? new Date(task.dueDate) : null;
  const assigneeName = task?.assignedToUser
    ? `${task.assignedToUser.firstName ?? ''} ${task.assignedToUser.lastName ?? ''}`.trim()
    : task?.assignedTo || 'Unassigned';

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent borderTopLeftRadius="2xl" borderBottomLeftRadius="2xl">
        <DrawerCloseButton />
        <DrawerHeader pb={2}>
          <Stack spacing={2} pr={8}>
            <Badge alignSelf="flex-start" colorScheme="teal" borderRadius="full" px={3} py={1}>
              Unified Action Panel
            </Badge>
            <Text fontSize="xl" fontWeight="700" color="#0f172a">
              {task?.title ?? 'Task'}
            </Text>
            <Text color="gray.500" fontSize="sm">
              Allowed actions: comment, accept, decline.
            </Text>
          </Stack>
        </DrawerHeader>

        <DrawerBody>
          {task ? (
            <Stack spacing={4}>
              <Box p={4} borderRadius="2xl" bg="gray.50" borderWidth="1px" borderColor="gray.100">
                <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                  <Box>
                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                      Details
                    </Text>
                    <Text fontWeight="700" color="#0f172a" mt={1}>
                      {task.description || 'No description provided.'}
                    </Text>
                  </Box>
                  {decision && (
                    <Badge colorScheme={decision === 'accepted' ? 'green' : 'red'} borderRadius="full" px={3} py={1}>
                      {decision === 'accepted' ? 'Accepted' : 'Declined'}
                    </Badge>
                  )}
                </Flex>

                <HStack spacing={2} mt={4} wrap="wrap">
                  <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>
                    {task.priority}
                  </Badge>
                  <Badge colorScheme={task.active === false ? 'orange' : 'green'} borderRadius="full" px={3} py={1}>
                    {task.active === false ? 'Archived' : 'Active'}
                  </Badge>
                  {dueDate && (
                    <Badge colorScheme="gray" borderRadius="full" px={3} py={1}>
                      Due {format(dueDate, 'MMM d, h:mm a')}
                    </Badge>
                  )}
                </HStack>

                <Text fontSize="sm" color="gray.600" mt={4}>
                  Assigned to: <strong>{assigneeName}</strong>
                </Text>
              </Box>

              <Box p={4} borderRadius="2xl" bg="white" borderWidth="1px" borderColor="gray.100">
                <Text fontWeight="700" color="#0f172a" mb={3}>
                  Comments
                </Text>
                <Stack spacing={3}>
                  {comments.length === 0 ? (
                    <Text color="gray.500" fontSize="sm">
                      No comments yet.
                    </Text>
                  ) : (
                    comments.map((comment) => (
                      <Box key={comment.id} p={3} borderRadius="xl" bg="gray.50" borderWidth="1px" borderColor="gray.100">
                        <Text whiteSpace="pre-wrap" color="#0f172a">
                          {comment.content}
                        </Text>
                        <Text fontSize="xs" color="gray.500" mt={2}>
                          {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                        </Text>
                      </Box>
                    ))
                  )}

                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Add a note for this task"
                    minH="110px"
                    borderRadius="xl"
                    bg="white"
                  />
                </Stack>
              </Box>
            </Stack>
          ) : null}
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px" borderTopColor="gray.100">
          <Stack spacing={3} w="full">
            <Button colorScheme="teal" onClick={handleComment} isDisabled={!draft.trim()}>
              Add comment
            </Button>
            <Divider />
            <HStack spacing={3}>
              <Button colorScheme="green" variant="outline" flex={1} onClick={onAccept}>
                Accept
              </Button>
              <Button colorScheme="red" variant="outline" flex={1} onClick={onDecline}>
                Decline
              </Button>
            </HStack>
          </Stack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default TaskActionPanel;