import { useEffect, useMemo, useState } from 'react';
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
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  Tabs,
  Textarea,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { dashboardService } from '../../services/dashboard.service';
import type { EmployeeDashboardResponse } from '../../types/dashboard';
import { AlertsPanel } from '../admin/AlertsPanel';
import { Board } from '../tasks/Board';
import { authService } from '../../services/auth.service';
import { useTimeTracking } from '../../hooks/useAdminMetrics';
import { MyWeekPlanner } from './MyWeekPlanner';
import { AvailabilityBadge } from '../shared/AvailabilityBadge';
import { ProductivitySettingsDrawer } from '../settings/ProductivitySettingsDrawer';
import { taskService } from '../../services/task.service';
import { Task, TaskDecisionStatus } from '../../types/task';

const cardSx = {
  bg: 'rgba(255,255,255,0.88)',
  borderRadius: '3xl',
  p: 5,
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
  border: '1px solid rgba(226, 232, 240, 0.8)',
};

type EmployeeView = 'tasks' | 'projects' | 'week';

interface EmployeeDashboardProps {
  activeView?: string;
}

export const EmployeeDashboard = ({ activeView = 'tasks' }: EmployeeDashboardProps) => {
  const currentUserId = authService.getCurrentUser()?.id;
  const { currentStatus, togglePause } = useTimeTracking(currentUserId);
  const [data, setData] = useState<EmployeeDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComment, setTaskComment] = useState('');
  const [taskTabIndex, setTaskTabIndex] = useState(0);

  const view: EmployeeView = useMemo(() => {
    if (activeView === 'projects' || activeView === 'week') {
      return activeView;
    }
    return 'tasks';
  }, [activeView]);

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
    if (!selectedTask) {
      setTaskComment('');
      return;
    }
    setTaskComment(selectedTask.employeeComment ?? '');
  }, [selectedTask]);

  const weeklyCapacity = useMemo(() => {
    const tasks = data?.tasks ?? [];
    const assignedHours = tasks.reduce((sum, task) => sum + Number(task.estimatedHours ?? 2), 0);
    return {
      assignedHours,
      availableHours: 40,
      openTasks: tasks.filter((task) => task.status !== 'DONE').length,
    };
  }, [data?.tasks]);

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
      <Flex justify="space-between" align={{ base: 'start', lg: 'center' }} mb={6} gap={4} wrap="wrap">
        <VStack align="start" spacing={1}>
          <Heading size="lg">My Work Hub</Heading>
          <Text fontSize="sm" color="gray.600">
            Projects, teammates, alerts, and tasks scoped to your assignments
          </Text>
        </VStack>
        <HStack spacing={2}>
          <AvailabilityBadge status={currentStatus} />
          <Button
            size="sm"
            colorScheme={currentStatus === 'ONLINE' ? 'green' : 'orange'}
            onClick={togglePause}
          >
            {currentStatus === 'PAUSE' ? 'Resume' : 'Pause'}
          </Button>
          <ProductivitySettingsDrawer />
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
        <Stack spacing={6}>
          {view === 'tasks' && (
            <Tabs colorScheme="blue" isLazy index={taskTabIndex} onChange={setTaskTabIndex}>
              <TabList mb={4}>
                <Tab>Task Board</Tab>
                <Tab>Action Queue</Tab>
                <Tab>
                  Alerts
                  {data.alerts.filter((a) => !a.isResolved).length > 0 && (
                    <Badge ml={2} colorScheme="red">
                      {data.alerts.filter((a) => !a.isResolved).length}
                    </Badge>
                  )}
                </Tab>
              </TabList>

              <TabPanels>
                <TabPanel px={0}>
                  <Box sx={cardSx}>
                    <Heading size="md" color="slate.800" mb={2}>Task Board</Heading>
                    <Text color="slate.500" mb={4}>
                      Click any task card to open Action Queue. Drag-and-drop still works across all statuses.
                    </Text>
                    <Board
                      showControls={false}
                      employeeInteractionOnly
                      onEmployeeTaskSelect={(task) => {
                        setSelectedTask(task);
                        setTaskComment(task.employeeComment ?? '');
                        setTaskTabIndex(1);
                      }}
                    />
                  </Box>
                </TabPanel>

                <TabPanel px={0}>
                  <Box sx={cardSx}>
                    <Heading size="md" color="slate.800" mb={2}>Action Queue</Heading>
                    <Text color="slate.500" mb={4}>
                      Review a selected task and respond with a comment, accept, or decline.
                    </Text>
                    {selectedTask ? (
                      <Stack spacing={4}>
                        <Box p={4} borderRadius="2xl" bg="white" border="1px solid" borderColor="slate.100">
                          <HStack justify="space-between" align="start" mb={3} wrap="wrap">
                            <Box>
                              <Heading size="sm">{selectedTask.title}</Heading>
                              <Text color="slate.500" mt={2}>
                                {selectedTask.description || 'No extra task description yet.'}
                              </Text>
                              {selectedTask.rationale && (
                                <Text color="teal.600" fontSize="sm" mt={3}>
                                  Why this task: {selectedTask.rationale}
                                </Text>
                              )}
                            </Box>
                            <VStack align="end" spacing={2}>
                              <Badge colorScheme="blue">{selectedTask.status.replace('_', ' ')}</Badge>
                              <Badge colorScheme={selectedTask.priority === 'HIGH' ? 'red' : selectedTask.priority === 'MEDIUM' ? 'yellow' : 'green'}>
                                {selectedTask.priority}
                              </Badge>
                            </VStack>
                          </HStack>
                          <Textarea
                            placeholder="Add a comment"
                            value={taskComment}
                            onChange={(event) => setTaskComment(event.target.value)}
                          />
                          <HStack mt={4} spacing={3} wrap="wrap">
                            <Button
                              colorScheme="teal"
                              variant={selectedTask.decisionStatus === TaskDecisionStatus.ACCEPTED ? 'solid' : 'outline'}
                              onClick={() => {
                                void taskService.updateTask(selectedTask.id, {
                                  employeeComment: taskComment,
                                  decisionStatus: TaskDecisionStatus.ACCEPTED,
                                }).then(async () => {
                                  await fetchData();
                                  setSelectedTask((prev) => prev ? {
                                    ...prev,
                                    employeeComment: taskComment,
                                    decisionStatus: TaskDecisionStatus.ACCEPTED,
                                  } : prev);
                                });
                              }}
                            >
                              Accept
                            </Button>
                            <Button
                              colorScheme="red"
                              variant={selectedTask.decisionStatus === TaskDecisionStatus.DECLINED ? 'solid' : 'outline'}
                              onClick={() => {
                                void taskService.updateTask(selectedTask.id, {
                                  employeeComment: taskComment,
                                  decisionStatus: TaskDecisionStatus.DECLINED,
                                }).then(async () => {
                                  await fetchData();
                                  setSelectedTask((prev) => prev ? {
                                    ...prev,
                                    employeeComment: taskComment,
                                    decisionStatus: TaskDecisionStatus.DECLINED,
                                  } : prev);
                                });
                              }}
                            >
                              Decline
                            </Button>
                            <Button
                              variant="outline"
                              colorScheme="blue"
                              onClick={() => {
                                void taskService.updateTask(selectedTask.id, {
                                  employeeComment: taskComment,
                                }).then(async () => {
                                  await fetchData();
                                  setSelectedTask((prev) => prev ? {
                                    ...prev,
                                    employeeComment: taskComment,
                                  } : prev);
                                });
                              }}
                            >
                              Save comment
                            </Button>
                          </HStack>
                        </Box>

                        <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
                          <Heading size="sm" mb={3}>Same-Project Directory</Heading>
                          <Table size="sm">
                            <Thead>
                              <Tr>
                                <Th>Name</Th>
                                <Th>Email</Th>
                                <Th>Status</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {data.employees.map((emp) => (
                                <Tr key={emp.id}>
                                  <Td>{emp.name}</Td>
                                  <Td>{emp.email || '-'}</Td>
                                  <Td><AvailabilityBadge status={emp.presenceStatus} /></Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </Box>
                      </Stack>
                    ) : (
                      <Box bg="white" borderRadius="lg" p={8} textAlign="center" boxShadow="sm">
                        <Text color="gray.500">Select a task from the Task Board to open its Action Queue.</Text>
                      </Box>
                    )}
                  </Box>
                </TabPanel>

                <TabPanel px={0}>
                  <AlertsPanel alerts={data.alerts} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}

          {view === 'projects' && (
            <Stack spacing={6}>
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
                <Box sx={cardSx}>
                  <Text color="slate.500" fontSize="sm">Assigned projects</Text>
                  <Heading size="lg" mt={2}>{data.projects.length}</Heading>
                </Box>
                <Box sx={cardSx}>
                  <Text color="slate.500" fontSize="sm">Open tasks</Text>
                  <Heading size="lg" mt={2}>{weeklyCapacity.openTasks}</Heading>
                </Box>
                <Box sx={cardSx}>
                  <Text color="slate.500" fontSize="sm">Weekly load</Text>
                  <Heading size="lg" mt={2}>{weeklyCapacity.assignedHours}h</Heading>
                </Box>
              </SimpleGrid>

              <Box sx={cardSx}>
                <Heading size="md" color="slate.800" mb={4}>Projects</Heading>
                {data.projects.length === 0 ? (
                  <Text color="gray.500">No assigned projects yet.</Text>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                    {data.projects.map((project) => (
                      <Box key={project.id} p={4} borderRadius="2xl" bg="white" border="1px solid" borderColor="slate.100">
                        <Heading size="sm">{project.name}</Heading>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}

                <Box mt={6}>
                  <Heading size="sm" color="slate.700" mb={3}>Same-project directory</Heading>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Email</Th>
                        <Th>Status</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.employees.map((emp) => (
                        <Tr key={emp.id}>
                          <Td>{emp.name}</Td>
                          <Td>{emp.email || '-'}</Td>
                          <Td><AvailabilityBadge status={emp.presenceStatus} /></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            </Stack>
          )}

          {view === 'week' && (
            <MyWeekPlanner
              tasks={data.tasks}
              onScheduleTask={(taskId, slot) => {
                void taskService.updateTask(taskId, { dueDate: slot }).then(fetchData);
              }}
            />
          )}
        </Stack>
      )}
    </Box>
  );
};
