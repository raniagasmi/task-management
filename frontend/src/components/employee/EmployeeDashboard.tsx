import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  Progress,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  useDisclosure,
  useToast,
  Tooltip,
  Avatar,
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

export type EmployeeDashboardSection = 'tasks' | 'projects' | 'calendar' | 'alerts';

interface EmployeeDashboardProps {
  initialSection?: EmployeeDashboardSection;
}

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

  const projectInsights = useMemo(() => {
    if (!data) {
      return [] as Array<{
        id: string;
        name: string;
        tasks: TaskType[];
        total: number;
        done: number;
        inProgress: number;
        todo: number;
        highPriority: number;
        completionRate: number;
        dueSoon: number;
        colleagues: string[];
      }>;
    }

    const getTaskProjectKey = (task: TaskType) => task.projectId ?? task.conversationId ?? null;
    const projects = data.projects ?? [];
    if (projects.length === 0) {
      return [];
    }

    return projects.map((project) => {
      const tasks = data.tasks.filter((task) => getTaskProjectKey(task) === project.id);

      const total = tasks.length;
      const done = tasks.filter((task) => task.status === 'DONE').length;
      const inProgress = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
      const todo = tasks.filter((task) => task.status === 'TODO').length;
      const highPriority = tasks.filter((task) => task.priority === 'HIGH').length;

      const dueSoon = tasks.filter((task) => {
        if (!task.dueDate) {
          return false;
        }
        const due = new Date(task.dueDate).getTime();
        if (Number.isNaN(due)) {
          return false;
        }
        const now = Date.now();
        const inThreeDays = now + 3 * 24 * 60 * 60 * 1000;
        return due >= now && due <= inThreeDays;
      }).length;

      const colleagueIds = Array.from(new Set(tasks.map((task) => task.assignedTo).filter(Boolean)));
      const colleagues = data.employees
        .filter((employee) => colleagueIds.includes(employee.id))
        .map((employee) => employee.name);

      return {
        id: project.id,
        name: project.name,
        tasks,
        total,
        done,
        inProgress,
        todo,
        highPriority,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
        dueSoon,
        colleagues,
      };
    });
  }, [data]);

  const unlinkedTasks = useMemo(() => {
    if (!data) {
      return [] as TaskType[];
    }

    const projectIds = new Set((data.projects ?? []).map((project) => project.id));
    return data.tasks.filter((task) => {
      const key = task.projectId ?? task.conversationId;
      return !key || !projectIds.has(key);
    });
  }, [data]);

  const projectTotals = useMemo(() => {
    const totalTasks = projectInsights.reduce((sum, project) => sum + project.total, 0);
    const completedTasks = projectInsights.reduce((sum, project) => sum + project.done, 0);
    const dueSoonTasks = projectInsights.reduce((sum, project) => sum + project.dueSoon, 0);

    return {
      totalProjects: projectInsights.length,
      totalTasks,
      completedTasks,
      dueSoonTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }, [projectInsights]);

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
          {/* Header controls: show for Tasks and Alerts sections only */}
          {(currentSection === 'tasks' || currentSection === 'alerts') && (
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
          )}

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
                <Heading size="md" color="#0f172a" mb={2} fontWeight="700">
                  My Week Calendar
                </Heading>
                <Text color="gray.600" mb={4}>
                  Calendar-based weekly planning. Drag tasks between days to rebalance workload and keep capacity under control.
                </Text>
                <MyWeekCalendar tasks={data.tasks} onTaskSelect={handleTaskSelect} />
              </Box>
            )}

            {currentSection === 'projects' && (
              <Box bg="white" borderRadius="2xl" boxShadow="0 12px 30px rgba(15, 23, 42, 0.06)" p={6}>
                <Heading size="md" mb={2} color="#0f172a">My Projects</Heading>
                <Text color="gray.600" mb={5}>
                  Portfolio overview with delivery health, workload, and team context.
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4} mb={5}>
                  <Box borderWidth={1} borderColor="gray.100" borderRadius="xl" p={4}>
                    <Text fontSize="xs" textTransform="uppercase" color="gray.500" letterSpacing="0.08em">Projects</Text>
                    <Heading size="md" mt={1}>{projectTotals.totalProjects}</Heading>
                  </Box>
                  <Box borderWidth={1} borderColor="gray.100" borderRadius="xl" p={4}>
                    <Text fontSize="xs" textTransform="uppercase" color="gray.500" letterSpacing="0.08em">Tracked Tasks</Text>
                    <Heading size="md" mt={1}>{projectTotals.totalTasks}</Heading>
                  </Box>
                  <Box borderWidth={1} borderColor="gray.100" borderRadius="xl" p={4}>
                    <Text fontSize="xs" textTransform="uppercase" color="gray.500" letterSpacing="0.08em">Completion</Text>
                    <Heading size="md" mt={1}>{projectTotals.completionRate}%</Heading>
                  </Box>
                  <Box borderWidth={1} borderColor="gray.100" borderRadius="xl" p={4}>
                    <Text fontSize="xs" textTransform="uppercase" color="gray.500" letterSpacing="0.08em">Due Soon (3d)</Text>
                    <Heading size="md" mt={1}>{projectTotals.dueSoonTasks}</Heading>
                  </Box>
                </SimpleGrid>

                {projectInsights.length === 0 ? (
                  <Box borderWidth={1} borderStyle="dashed" borderColor="gray.200" borderRadius="xl" p={6}>
                    <Text color="gray.600">No projects assigned yet.</Text>
                  </Box>
                ) : (
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                    {projectInsights.map((project) => (
                      <Box key={project.id} borderWidth={1} borderColor="gray.100" borderRadius="xl" p={5}>
                        <Flex justify="space-between" align="center" mb={2}>
                          <Heading size="sm">{project.name}</Heading>
                          <Badge colorScheme={project.completionRate >= 75 ? 'green' : project.completionRate >= 40 ? 'yellow' : 'orange'}>
                            {project.completionRate}% complete
                          </Badge>
                        </Flex>

                        <Progress value={project.completionRate} size="sm" borderRadius="full" colorScheme="teal" mb={4} />

                        <SimpleGrid columns={4} spacing={3} mb={4}>
                          <Box>
                            <Text fontSize="xs" color="gray.500">Total</Text>
                            <Text fontWeight="700">{project.total}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color="gray.500">Done</Text>
                            <Text fontWeight="700">{project.done}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color="gray.500">In Progress</Text>
                            <Text fontWeight="700">{project.inProgress}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color="gray.500">To Do</Text>
                            <Text fontWeight="700">{project.todo}</Text>
                          </Box>
                        </SimpleGrid>

                        <HStack spacing={2} mb={3} wrap="wrap">
                          <Badge colorScheme={project.highPriority > 0 ? 'red' : 'gray'}>
                            High Priority: {project.highPriority}
                          </Badge>
                          <Badge colorScheme={project.dueSoon > 0 ? 'orange' : 'gray'}>
                            Due Soon: {project.dueSoon}
                          </Badge>
                        </HStack>

                        <Text fontSize="xs" color="gray.500" mb={2}>Teammates</Text>
                        {project.colleagues.length > 0 ? (
                          <Tooltip label={project.colleagues.join(', ')} placement="top" hasArrow>
                            <Avatar size="sm" name={project.colleagues[0]} />
                          </Tooltip>
                        ) : (
                          <Text fontSize="sm" color="gray.500">No teammates mapped</Text>
                        )}
                      </Box>
                    ))}
                  </SimpleGrid>
                )}

                {unlinkedTasks.length > 0 && (
                  <Box mt={6} borderWidth={1} borderStyle="dashed" borderColor="orange.200" borderRadius="xl" p={4} bg="orange.50">
                    <HStack justify="space-between" mb={2}>
                      <Heading size="sm" color="orange.800">Unlinked work</Heading>
                      <Badge colorScheme="orange">{unlinkedTasks.length}</Badge>
                    </HStack>
                    <Text color="orange.700" fontSize="sm">
                      These tasks are not linked to a known project id yet. Once the API consistently returns projectId,
                      they will appear under the correct project card automatically.
                    </Text>
                  </Box>
                )}
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
