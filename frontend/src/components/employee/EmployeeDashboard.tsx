import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  SimpleGrid,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { dashboardService } from '../../services/dashboard.service';
import type { EmployeeDashboardResponse } from '../../types/dashboard';
import { AlertsPanel } from '../admin/AlertsPanel';
import { Board } from '../tasks/Board';
import { authService } from '../../services/auth.service';
import { useTimeTracking } from '../../hooks/useAdminMetrics';
import { collaborationService } from '../../services/collaboration.service';
import TaskActionPanel, { TaskActionComment, TaskDecision } from '../tasks/TaskActionPanel';
import { Task as TaskType } from '../../types/task';

export type EmployeeDashboardSection = 'tasks' | 'projects' | 'calendar' | 'alerts';

interface EmployeeDashboardProps {
  initialSection?: EmployeeDashboardSection;
}

const sectionToTabIndex: Record<EmployeeDashboardSection, number> = {
  tasks: 0,
  projects: 0,
  calendar: 0,
  alerts: 1,
};

export const EmployeeDashboard = ({ initialSection = 'tasks' }: EmployeeDashboardProps) => {
  const currentUserId = authService.getCurrentUser()?.id;
  const { currentStatus, togglePause } = useTimeTracking(currentUserId);
  const toast = useToast();
  const actionPanel = useDisclosure();

  const [data, setData] = useState<EmployeeDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentSection, setCurrentSection] = useState<EmployeeDashboardSection>(initialSection);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
  const [taskComments, setTaskComments] = useState<TaskActionComment[]>([]);
  const [taskDecision, setTaskDecision] = useState<TaskDecision | null>(null);

  const actionStorageKey = (taskId: string) => `task-action:${taskId}`;

  const loadTaskActionState = (taskId: string) => {
    if (typeof window === 'undefined') {
      return { comments: [] as TaskActionComment[], decision: null as TaskDecision | null };
    }

    try {
      const raw = window.localStorage.getItem(actionStorageKey(taskId));
      if (!raw) {
        return { comments: [] as TaskActionComment[], decision: null as TaskDecision | null };
      }

      const parsed = JSON.parse(raw) as { comments?: TaskActionComment[]; decision?: TaskDecision | null };
      return {
        comments: Array.isArray(parsed.comments) ? parsed.comments : [],
        decision: parsed.decision === 'accepted' || parsed.decision === 'declined' ? parsed.decision : null,
      };
    } catch {
      return { comments: [] as TaskActionComment[], decision: null as TaskDecision | null };
    }
  };

  const persistTaskActionState = (taskId: string, comments: TaskActionComment[], decision: TaskDecision | null) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(actionStorageKey(taskId), JSON.stringify({ comments, decision }));
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dashboardService.getMyDashboard();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    setCurrentSection(initialSection);
  }, [initialSection]);

  const handleTaskSelect = (task: TaskType) => {
    setSelectedTask(task);
    const nextState = loadTaskActionState(task.id);
    setTaskComments(nextState.comments);
    setTaskDecision(nextState.decision);
    actionPanel.onOpen();
  };

  const closeTaskActionPanel = () => {
    actionPanel.onClose();
    setSelectedTask(null);
    setTaskComments([]);
    setTaskDecision(null);
  };

  const sendLinkedConversationMessage = async (content: string) => {
    if (!selectedTask?.conversationId) {
      return;
    }

    try {
      await collaborationService.sendMessage(selectedTask.conversationId, content);
    } catch (error) {
      console.error('Failed to share task note to collaboration thread:', error);
      toast({
        title: 'Saved locally',
        description: 'The note could not be shared to the linked collaboration thread.',
        status: 'warning',
        duration: 3500,
        isClosable: true,
      });
    }
  };

  const handleAddComment = async (content: string) => {
    if (!selectedTask) {
      return;
    }

    const nextComments = [
      ...taskComments,
      {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${taskComments.length}`,
        content,
        createdAt: new Date().toISOString(),
      },
    ];

    setTaskComments(nextComments);
    persistTaskActionState(selectedTask.id, nextComments, taskDecision);
    await sendLinkedConversationMessage(`Task comment: ${content}`);
    toast({
      title: 'Comment added',
      status: 'success',
      duration: 2200,
      isClosable: true,
    });
  };

  const handleSetDecision = async (decision: TaskDecision) => {
    if (!selectedTask) {
      return;
    }

    setTaskDecision(decision);
    persistTaskActionState(selectedTask.id, taskComments, decision);
    await sendLinkedConversationMessage(
      decision === 'accepted'
        ? `Task accepted: ${selectedTask.title}`
        : `Task declined: ${selectedTask.title}`,
    );

    toast({
      title: decision === 'accepted' ? 'Task accepted' : 'Task declined',
      status: decision === 'accepted' ? 'success' : 'info',
      duration: 2200,
      isClosable: true,
    });
  };

  if (error) {
    return (
      <Box bg="red.50" p={4} borderRadius="md">
        <Text color="red.700">Failed to load dashboard: {error}</Text>
        <Button mt={2} colorScheme="red" size="sm" onClick={fetchData}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg">My Dashboard</Heading>
          <Text fontSize="sm" color="gray.600">
            Projects, teammates, alerts, and tasks scoped to your assignments
          </Text>
        </VStack>
        <HStack spacing={2}>
          <Button
            size="sm"
            colorScheme={currentStatus === 'ONLINE' ? 'green' : 'orange'}
            onClick={togglePause}
          >
            {currentStatus === 'PAUSE' ? 'Resume' : 'Pause'}
          </Button>
          <IconButton
            aria-label="Refresh"
            icon={<RepeatIcon />}
            size="sm"
            onClick={fetchData}
            isLoading={isLoading}
          />
        </HStack>
      </Flex>

      {isLoading && (
        <Box textAlign="center" py={10}>
          <Spinner />
        </Box>
      )}

      {!isLoading && data && (
        <Box bg="white" borderRadius="2xl" boxShadow="0 8px 24px rgba(0, 0, 0, 0.08)" overflow="hidden">
          {/* Header controls: simplified to only Tasks and Alerts. Sidebar controls projects/calendar which render below */}
          <Box px={6} py={4} bg="linear-gradient(135deg, rgba(16, 185, 129, 0.02), rgba(59, 130, 246, 0.02))" borderBottomWidth="2px" borderColor="gray.100">
            <HStack spacing={4} align="center">
              <Button variant={currentSection === 'tasks' ? 'solid' : 'ghost'} colorScheme="teal" onClick={() => setCurrentSection('tasks')}>
                Tasks
              </Button>

              <Button variant={currentSection === 'alerts' ? 'solid' : 'ghost'} colorScheme="teal" onClick={() => setCurrentSection('alerts')}>
                Alerts
                {data.alerts.filter((a) => !a.isResolved).length > 0 && (
                  <Badge ml={2} colorScheme="red" borderRadius="full">
                    {data.alerts.filter((a) => !a.isResolved).length}
                  </Badge>
                )}
              </Button>
            </HStack>
          </Box>

          <Box p={6}>
            {currentSection === 'tasks' && (
              <Box>
                <Board showControls={false} showTaskActionPanel={false} onTaskSelect={handleTaskSelect} />
              </Box>
            )}

            {currentSection === 'alerts' && (
              <Box>
                <AlertsPanel alerts={data.alerts} />
              </Box>
            )}

            {currentSection === 'calendar' && (
              <Box bg="white" borderRadius="2xl" boxShadow="0 12px 30px rgba(15, 23, 42, 0.06)" p={6}>
                {/* Calendar view: reuse MyWeekCalendar but present title as "My Dashboard" and enable drag/drop and capacity visuals */}
                <Heading size="md" color="#0f172a" mb={2}>
                  My Dashboard
                </Heading>
                <Text color="gray.600" mb={4}>Interactive week view — drag tasks into time slots to schedule them. Shows assigned vs available capacity.</Text>
                <MyWeekCalendar tasks={data.tasks} onTaskSelect={handleTaskSelect} />
              </Box>
            )}

            {currentSection === 'projects' && (
              <Box bg="white" borderRadius="2xl" boxShadow="0 12px 30px rgba(15, 23, 42, 0.06)" p={6}>
                <Heading size="md" mb={3} color="#0f172a">My Projects</Heading>
                <Text color="gray.600" mb={4}>Assigned projects and key details</Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {data.projects.map((proj) => {
                    const projectTasks = data.tasks.filter((t) => t.conversationId === proj.id);
                    const colleagueIds = Array.from(new Set(projectTasks.map((t) => t.assignedTo)));
                    const colleagues = data.employees.filter((e) => colleagueIds.includes(e.id));

                    return (
                      <Box key={proj.id} borderWidth={1} borderColor="gray.100" borderRadius="lg" p={4}>
                        <Heading size="sm" mb={2}>{proj.name}</Heading>
                        <Text fontSize="sm" color="gray.600" mb={2}>{projectTasks.length} tasks assigned</Text>
                        <Text fontSize="sm" color="gray.600" mb={3}>{colleagues.length} teammates</Text>
                        <HStack spacing={2}>
                          {colleagues.slice(0, 4).map((c) => (
                            <Badge key={c.id} colorScheme="teal">{c.name}</Badge>
                          ))}
                        </HStack>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </Box>
            )}
          </Box>
        </Box>
      )}

      <TaskActionPanel
        isOpen={actionPanel.isOpen}
        task={selectedTask}
        comments={taskComments}
        decision={taskDecision}
        onClose={closeTaskActionPanel}
        onAddComment={(content) => void handleAddComment(content)}
        onAccept={() => void handleSetDecision('accepted')}
        onDecline={() => void handleSetDecision('declined')}
      />
    </Box>
  );
};
