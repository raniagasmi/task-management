import { useMemo, useRef } from 'react';
import {
  Badge,
  Box,
  Flex,
  Heading,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { addDays, format, isSameDay, setHours, setMinutes, startOfWeek } from 'date-fns';
import { Task } from '../../types/task';

interface MyWeekPlannerProps {
  tasks: Task[];
  onScheduleTask: (taskId: string, slot: Date) => void;
}

const HOURS = [9, 11, 13, 15, 17];

const PlannerTask = ({ task }: { task: Task }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      opacity={isDragging ? 0.4 : 1}
      transform={transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined}
      cursor="grab"
      p={3}
      borderRadius="xl"
      bg="white"
      border="1px solid"
      borderColor="teal.100"
      boxShadow="sm"
    >
      <Text fontWeight="700" color="slate.800" noOfLines={1}>{task.title}</Text>
      <HStack mt={2} spacing={2}>
        <Badge colorScheme="teal">{task.estimatedHours ?? 2}h</Badge>
        <Badge colorScheme={task.priority === 'HIGH' ? 'red' : task.priority === 'MEDIUM' ? 'yellow' : 'green'}>
          {task.priority}
        </Badge>
      </HStack>
    </Box>
  );
};

const PlannerSlot = ({
  slot,
  tasks,
}: {
  slot: Date;
  tasks: Task[];
}) => {
  const slotId = slot.toISOString();
  const { isOver, setNodeRef } = useDroppable({ id: slotId, data: { slot } });

  return (
    <Box
      ref={setNodeRef}
      minH="130px"
      p={3}
      borderRadius="2xl"
      border="1px dashed"
      borderColor={isOver ? 'teal.400' : 'teal.100'}
      bg={isOver ? 'teal.50' : 'rgba(255,255,255,0.76)'}
      transition="all 0.2s ease"
    >
      <Text fontSize="xs" color="slate.500" mb={3}>
        {format(slot, 'EEE HH:mm')}
      </Text>
      <Stack spacing={2}>
        {tasks.map((task) => (
          <PlannerTask key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <Text fontSize="sm" color="slate.400">
            Drop work here
          </Text>
        )}
      </Stack>
    </Box>
  );
};

export const MyWeekPlanner = ({ tasks, onScheduleTask }: MyWeekPlannerProps) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const activeTask = useRef<Task | null>(null);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const slots = useMemo(
    () =>
      Array.from({ length: 5 }).flatMap((_, dayIndex) =>
        HOURS.map((hour) => setMinutes(setHours(addDays(weekStart, dayIndex), hour), 0)),
      ),
    [weekStart],
  );

  const capacity = useMemo(() => {
    const assignedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours ?? 2), 0);
    const availableHours = slots.length * 2;
    return { assignedHours, availableHours };
  }, [slots.length, tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    activeTask.current = (event.active.data.current?.task as Task) ?? null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    activeTask.current = null;
    if (!event.over) {
      return;
    }

    const slot = event.over.data.current?.slot as Date | undefined;
    if (slot) {
      onScheduleTask(String(event.active.id), slot);
    }
  };

  return (
    <Box bg="rgba(255,255,255,0.85)" borderRadius="3xl" p={5} boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)">
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
        <Box>
          <Heading size="md" color="slate.800">My Week</Heading>
          <Text color="slate.500">Drag work into time slots to shape your week.</Text>
        </Box>
        <HStack>
          <Badge colorScheme={capacity.assignedHours > capacity.availableHours ? 'red' : 'green'} px={3} py={1} borderRadius="full">
            {capacity.assignedHours}h assigned
          </Badge>
          <Badge colorScheme="blue" px={3} py={1} borderRadius="full">
            {capacity.availableHours}h available
          </Badge>
        </HStack>
      </Flex>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Box mb={5}>
          <Text fontWeight="700" color="slate.700" mb={2}>Unscheduled</Text>
          <Flex gap={3} overflowX="auto">
            {tasks.filter((task) => !task.dueDate).map((task) => (
              <Box key={task.id} minW="220px">
                <PlannerTask task={task} />
              </Box>
            ))}
            {tasks.filter((task) => !task.dueDate).length === 0 && (
              <Text color="slate.400">All visible tasks are already scheduled this week.</Text>
            )}
          </Flex>
        </Box>
        <Stack spacing={4}>
          {Array.from({ length: 5 }).map((_, dayIndex) => {
            const day = addDays(weekStart, dayIndex);
            return (
              <Box key={day.toISOString()}>
                <Text fontWeight="700" color="slate.700" mb={2}>
                  {format(day, 'EEEE, MMM d')}
                </Text>
                <Flex gap={3} overflowX="auto">
                  {slots
                    .filter((slot) => isSameDay(slot, day))
                    .map((slot) => (
                      <Box key={slot.toISOString()} minW="210px" flex="1">
                        <PlannerSlot
                          slot={slot}
                          tasks={tasks.filter((task) => task.dueDate && isSameDay(new Date(task.dueDate), slot) && new Date(task.dueDate).getHours() === slot.getHours())}
                        />
                      </Box>
                    ))}
                </Flex>
              </Box>
            );
          })}
        </Stack>
        <DragOverlay>
          {activeTask.current ? <PlannerTask task={activeTask.current} /> : null}
        </DragOverlay>
      </DndContext>
    </Box>
  );
};
