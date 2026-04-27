import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Flex,
  Heading,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { closestCorners, DndContext, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import Task from '../tasks/Task';
import { taskService } from '../../services/task.service';
import { Task as TaskType, TaskPriority } from '../../types/task';

const WORKDAY_START_MINUTES = 9 * 60;
const WORKDAY_CAPACITY_MINUTES = 8 * 60;

const priorityDurationMinutes: Record<TaskPriority, number> = {
  LOW: 60,
  MEDIUM: 90,
  HIGH: 120,
};

const toValidDate = (value?: Date | string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const hasExplicitTime = (date: Date) =>
  date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0 || date.getMilliseconds() !== 0;

const estimateDuration = (task: TaskType) => priorityDurationMinutes[task.priority] ?? priorityDurationMinutes.MEDIUM;

const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

type ScheduledTask = TaskType & { dueDate: Date };

type DaySchedule = {
  key: string;
  day: Date;
  tasks: ScheduledTask[];
  assignedMinutes: number;
};

interface ScheduleColumnProps {
  schedule: DaySchedule;
  onTaskClick?: (task: TaskType) => void;
}

const ScheduleColumn = ({ schedule, onTaskClick }: ScheduleColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: schedule.key });
  const loadPercentage = Math.min((schedule.assignedMinutes / WORKDAY_CAPACITY_MINUTES) * 100, 100);
  const availableMinutes = Math.max(WORKDAY_CAPACITY_MINUTES - schedule.assignedMinutes, 0);
  const overCapacity = schedule.assignedMinutes > WORKDAY_CAPACITY_MINUTES;

  return (
    <Box
      ref={setNodeRef}
      minW="240px"
      flex="1"
      p={4}
      borderRadius="2xl"
      borderWidth="1px"
      borderColor={isOver ? 'teal.300' : 'gray.100'}
      bg={isOver ? 'rgba(15,118,110,0.06)' : 'white'}
      boxShadow={isOver ? '0 18px 32px rgba(15, 118, 110, 0.12)' : '0 12px 30px rgba(15, 23, 42, 0.06)'}
      transition="all 0.2s ease"
    >
      <Stack spacing={3} h="full">
        <Flex justify="space-between" align="start" gap={3}>
          <Box>
            <Text fontSize="sm" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
              {format(schedule.day, 'EEE')}
            </Text>
            <Heading size="sm" color="#0f172a">
              {format(schedule.day, 'MMM d')}
            </Heading>
          </Box>
          <Badge colorScheme={overCapacity ? 'red' : 'teal'} borderRadius="full" px={3} py={1}>
            {Math.round(loadPercentage)}%
          </Badge>
        </Flex>

        <Box>
          <Flex justify="space-between" fontSize="xs" color="gray.500" mb={2}>
            <Text>{Math.round(schedule.assignedMinutes / 60)}h assigned</Text>
            <Text>{Math.round(availableMinutes / 60)}h available</Text>
          </Flex>
          <Progress value={loadPercentage} borderRadius="full" size="sm" colorScheme={overCapacity ? 'red' : 'teal'} />
        </Box>

        <SortableContext items={schedule.tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={3} flex={1} minH="220px">
            {schedule.tasks.length === 0 ? (
              <Box
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="gray.200"
                borderRadius="xl"
                p={4}
                bg="gray.50"
                minH="180px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="gray.500" fontSize="sm" textAlign="center">
                  Drop a task here to schedule it.
                </Text>
              </Box>
            ) : (
              schedule.tasks.map((task) => (
                <Box key={task.id}>
                  <Tooltip label={format(task.dueDate, 'PPP p')} placement="top-start">
                    <Text fontSize="xs" color="gray.500" mb={1}>
                      {format(task.dueDate, 'h:mm a')}
                    </Text>
                  </Tooltip>
                  <Task task={task} onEdit={onTaskClick ?? (() => undefined)} onDelete={() => undefined} />
                </Box>
              ))
            )}
          </Stack>
        </SortableContext>
      </Stack>
    </Box>
  );
};

interface MyWeekCalendarProps {
  tasks: TaskType[];
  onTaskSelect?: (task: TaskType) => void;
}

const MyWeekCalendar = ({ tasks, onTaskSelect }: MyWeekCalendarProps) => {
  const toast = useToast();
  const [calendarTasks, setCalendarTasks] = useState<TaskType[]>(tasks);

  useEffect(() => {
    setCalendarTasks(tasks);
  }, [tasks]);

  const weekDays = useMemo(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  }, []);

  const schedules = useMemo<DaySchedule[]>(() => {
    const buckets = new Map<string, TaskType[]>();

    weekDays.forEach((day) => {
      buckets.set(dayKey(day), []);
    });

    calendarTasks.forEach((task) => {
      const baseDate = toValidDate(task.dueDate ?? task.createdAt);

      if (!baseDate) {
        return;
      }

      const matchedDay = weekDays.find((day) => isSameDay(day, baseDate));
      if (!matchedDay) {
        return;
      }

      buckets.get(dayKey(matchedDay))?.push(task);
    });

    return weekDays.map((day) => {
      const tasksForDay = (buckets.get(dayKey(day)) ?? []).slice().sort((left, right) => {
        const leftDate = toValidDate(left.dueDate ?? left.createdAt)?.getTime() ?? 0;
        const rightDate = toValidDate(right.dueDate ?? right.createdAt)?.getTime() ?? 0;

        if (leftDate !== rightDate) {
          return leftDate - rightDate;
        }

        if (left.order !== right.order) {
          return left.order - right.order;
        }

        return estimateDuration(right) - estimateDuration(left);
      });

      let cursor = WORKDAY_START_MINUTES;
      const scheduledTasks = tasksForDay.map((task) => {
        const existingDate = toValidDate(task.dueDate);
        const useExplicitTime = existingDate ? hasExplicitTime(existingDate) : false;
        const displayMinutes = useExplicitTime && existingDate ? existingDate.getHours() * 60 + existingDate.getMinutes() : cursor;
        const scheduledAt = new Date(day);
        scheduledAt.setHours(Math.floor(displayMinutes / 60), displayMinutes % 60, 0, 0);

        const durationMinutes = estimateDuration(task);
        cursor = Math.max(cursor, displayMinutes + durationMinutes);

        return {
          ...task,
          dueDate: scheduledAt,
        } as ScheduledTask;
      });

      return {
        key: dayKey(day),
        day,
        tasks: scheduledTasks,
        assignedMinutes: tasksForDay.reduce((sum, task) => sum + estimateDuration(task), 0),
      };
    });
  }, [calendarTasks, weekDays]);

  const overflowTasks = useMemo(
    () =>
      calendarTasks.filter((task) => {
        const baseDate = toValidDate(task.dueDate ?? task.createdAt);
        return !baseDate || !weekDays.some((day) => isSameDay(day, baseDate));
      }),
    [calendarTasks, weekDays],
  );

  const moveTaskToDay = async (taskId: string, targetDayKey: string) => {
    const targetSchedule = schedules.find((schedule) => schedule.key === targetDayKey);
    const sourceTask = calendarTasks.find((task) => task.id === taskId);

    if (!targetSchedule || !sourceTask) {
      return;
    }

    const taskDuration = estimateDuration(sourceTask);
    const tasksOnTargetDay = targetSchedule.tasks.filter((task) => task.id !== taskId);
    const occupiedMinutes = tasksOnTargetDay.reduce((sum, task) => sum + estimateDuration(task), 0);
    const nextStartMinutes = Math.min(
      WORKDAY_START_MINUTES + occupiedMinutes,
      WORKDAY_START_MINUTES + WORKDAY_CAPACITY_MINUTES - taskDuration,
    );

    const nextDate = new Date(targetSchedule.day);
    nextDate.setHours(Math.floor(nextStartMinutes / 60), nextStartMinutes % 60, 0, 0);

    const previousTasks = calendarTasks;
    setCalendarTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, dueDate: nextDate } : task)),
    );

    try {
      await taskService.updateTask(taskId, { dueDate: nextDate });
      toast({
        title: 'Task rescheduled',
        description: `${sourceTask.title} moved to ${format(nextDate, 'EEE, MMM d h:mm a')}`,
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      setCalendarTasks(previousTasks);
      toast({
        title: 'Failed to update schedule',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const taskId = String(active.id);
    const overId = String(over.id);
    const targetDay = schedules.find((schedule) => schedule.key === overId)
      ?? schedules.find((schedule) => schedule.tasks.some((task) => task.id === overId));

    if (!targetDay) {
      return;
    }

    void moveTaskToDay(taskId, targetDay.key);
  };

  return (
    <Stack spacing={5}>
      <Box>
        <Heading size="md" color="#0f172a">
          My Week
        </Heading>
        <Text color="gray.600" mt={1}>
          Drag tasks to another day to reschedule them. Time slots are auto-arranged from 9:00 AM to 5:00 PM.
        </Text>
      </Box>

      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <Flex gap={4} align="stretch" overflowX="auto" pb={2}>
          {schedules.map((schedule) => (
            <ScheduleColumn key={schedule.key} schedule={schedule} />
          ))}
        </Flex>
      </DndContext>

      {overflowTasks.length > 0 && (
        <Box bg="white" borderRadius="2xl" boxShadow="0 12px 30px rgba(15, 23, 42, 0.06)" p={5}>
          <Flex justify="space-between" align="center" mb={4}>
            <Box>
              <Heading size="sm" color="#0f172a">
                Outside this week
              </Heading>
              <Text color="gray.500" fontSize="sm">
                Tasks outside the current 7-day window stay visible here.
              </Text>
            </Box>
            <Badge colorScheme="gray" borderRadius="full" px={3} py={1}>
              {overflowTasks.length}
            </Badge>
          </Flex>

          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
            {overflowTasks.map((task) => {
              const displayDate = toValidDate(task.dueDate ?? task.createdAt) ?? new Date();

              return (
                <Box key={task.id}>
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    {format(displayDate, 'EEE, MMM d')}
                  </Text>
                  <Task task={task} onEdit={onTaskSelect ?? (() => undefined)} onDelete={() => undefined} />
                </Box>
              );
            })}
          </SimpleGrid>
        </Box>
      )}
    </Stack>
  );
};

export default MyWeekCalendar;