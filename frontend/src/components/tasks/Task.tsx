import React from 'react';
import {
  Avatar,
  Badge,
  Box,
  Card,
  CardBody,
  Flex,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { Task as TaskType } from '../../types/task';

interface TaskProps {
  task: TaskType;
  onEdit: (task: TaskType) => void;
  onDelete: (id: string) => void;
}

const Task: React.FC<TaskProps> = ({ task, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'pointer',
  };

  const priorityColors: Record<TaskType['priority'], string> = {
    LOW: 'green',
    MEDIUM: 'yellow',
    HIGH: 'red',
  };

  const assigneeName = task.assignedToUser
    ? `${task.assignedToUser.firstName ?? ''} ${task.assignedToUser.lastName ?? ''}`.trim()
    : '';
  const assigneeLabel = assigneeName || (task.assignedTo ? 'Unknown Employee' : 'Unassigned');
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const hasSpecificTime = dueDate
    ? dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0 || dueDate.getSeconds() !== 0 || dueDate.getMilliseconds() !== 0
    : false;
  const dueLabel = dueDate ? (hasSpecificTime ? format(dueDate, 'MMM d, h:mm a') : format(dueDate, 'MMM d')) : null;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      mb={2}
      role="button"
      tabIndex={0}
      onClick={() => onEdit(task)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onEdit(task);
        }
      }}
    >
      <Card
        bg="var(--light-color)"
        boxShadow="sm"
        _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
        transition="all 0.2s"
        position="relative"
        borderLeft="4px solid"
        borderLeftColor={`${priorityColors[task.priority]}.500`}
        cursor={isDragging ? 'grabbing' : 'pointer'}
      >
        <CardBody p={3}>
          <VStack align="stretch" spacing={2}>
            <Flex justify="space-between" align="center">
              <Tooltip label={task.title} placement="top-start">
                <Text color="var(--font-color)" fontWeight="medium" noOfLines={1}>
                  {task.title}
                </Text>
              </Tooltip>
            </Flex>
            {task.description && (
              <Tooltip label={task.description}>
                <Text fontSize="sm" color="gray.500" noOfLines={2}>
                  {task.description}
                </Text>
              </Tooltip>
            )}
            <Flex justify="space-between" align="center" fontSize="sm">
              <Flex align="center" gap={2}>
                <Badge colorScheme={priorityColors[task.priority]} variant="subtle">
                  {task.priority}
                </Badge>
                {task.dueDate && (
                  <Tooltip label={`Due: ${format(new Date(task.dueDate), 'PPP')}`}>
                    <Text color="gray.500" fontSize="xs">
                      {dueLabel}
                    </Text>
                  </Tooltip>
                )}
              </Flex>
              <Tooltip label={`Assigned to: ${assigneeLabel}`}>
                <Avatar name={assigneeLabel} size="xs" />
              </Tooltip>
            </Flex>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default Task;
