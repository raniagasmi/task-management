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
import MyWeekCalendar from './MyWeekCalendar';
import { collaborationService } from '../../services/collaboration.service';
import TaskActionPanel, { TaskActionComment, TaskDecision } from '../tasks/TaskActionPanel';
import { Task as TaskType } from '../../types/task';

export type EmployeeDashboardSection = 'work-hub' | 'projects' | 'week' | 'alerts' | 'team';

interface EmployeeDashboardProps {
  initialSection?: EmployeeDashboardSection;
}

const sectionToTabIndex: Record<EmployeeDashboardSection, number> = {
  'work-hub': 0,
  projects: 1,
  week: 2,
  alerts: 3,
  team: 4,
};

export const EmployeeDashboard = ({ initialSection = 'work-hub' }: EmployeeDashboardProps) => {
  const currentUserId = authService.getCurrentUser()?.id;
  const { currentStatus, togglePause } = useTimeTracking(currentUserId);
  const toast = useToast();
  const actionPanel = useDisclosure();

  const [data, setData] = useState<EmployeeDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [tabIndex, setTabIndex] = useState(sectionToTabIndex[initialSection]);
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
    setTabIndex(sectionToTabIndex[initialSection]);
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
        <Tabs colorScheme="blue" isLazy index={tabIndex} onChange={setTabIndex}>
          <TabList mb={4}>
            <Tab>My Work Hub</Tab>
            <Tab>My Projects</Tab>
            <Tab>My Week</Tab>
            <Tab>
              Alerts
              {data.alerts.filter((a) => !a.isResolved).length > 0 && (
                <Badge ml={2} colorScheme="red">
                  {data.alerts.filter((a) => !a.isResolved).length}
                </Badge>
              )}
            </Tab>
            <Tab>Team</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Board showControls={false} showTaskActionPanel={false} onTaskSelect={handleTaskSelect} />
            </TabPanel>

            <TabPanel>
              {data.projects.length === 0 ? (
                <Box bg="white" borderRadius="lg" p={8} textAlign="center" boxShadow="sm">
                  <Text color="gray.500">No assigned projects yet.</Text>
                </Box>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {data.projects.map((project) => (
                    <Box key={project.id} bg="white" p={4} borderRadius="lg" boxShadow="sm">
                      <Heading size="sm">{project.name}</Heading>
                    </Box>
                  ))}
                </SimpleGrid>
              )}
            </TabPanel>

            <TabPanel>
              <MyWeekCalendar tasks={data.tasks} onTaskSelect={handleTaskSelect} />
            </TabPanel>

            <TabPanel>
              <AlertsPanel alerts={data.alerts} />
            </TabPanel>

            <TabPanel>
              <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
                <Heading size="md" mb={3}>
                  Team directory
                </Heading>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Email</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.employees.map((emp) => (
                      <Tr key={emp.id}>
                        <Td>{emp.name}</Td>
                        <Td>{emp.email || '-'}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
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
