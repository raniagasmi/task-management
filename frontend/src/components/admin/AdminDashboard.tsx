import React, { useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Stack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  HStack,
  VStack,
  Spinner,
  Text,
  useToast,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { useAdminDashboard, useTimeTracking } from '../../hooks/useAdminMetrics';
import { EmployeeMetricsGrid } from './EmployeeMetricsCard';
import { AlertsPanel } from './AlertsPanel';
import { ProjectMetricsView } from './ProjectMetricsView';
import { EmployeeMetrics } from '../../types/analytics';
import { authService } from '../../services/auth.service';
import { Board } from '../tasks/Board';

interface AdminDashboardProps {
  isAdmin: boolean;
}

/**
 * Dashboard overview stats
 */
const DashboardOverview: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const { dashboardData, isLoading } = useAdminDashboard(isAdmin);
  const { currentStatus, focusTime } = useTimeTracking(authService.getCurrentUser()?.id);

  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner />
      </Box>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const totalEmployees = dashboardData.employees.length;
  const avgPerformance =
    totalEmployees > 0
      ? Math.round(
          dashboardData.employees.reduce((sum, e) => sum + e.performanceScore, 0) / totalEmployees
        )
      : 0;

  const totalTasks = dashboardData.taskBehaviors.length;
  const overloadedCount = dashboardData.employees.filter((e) => e.isOverloaded).length;
  const activeAlerts = dashboardData.alerts.filter((a) => !a.isResolved).length;

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm">
        <Stat>
          <StatLabel>Team Performance</StatLabel>
          <StatNumber>{avgPerformance}%</StatNumber>
          <StatHelpText>{totalEmployees} employees</StatHelpText>
        </Stat>
      </Box>

      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm">
        <Stat>
          <StatLabel>Total Tasks</StatLabel>
          <StatNumber>{totalTasks}</StatNumber>
          <StatHelpText>{dashboardData.projects.length} projects</StatHelpText>
        </Stat>
      </Box>

      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm">
        <Stat>
          <StatLabel>Workload Issues</StatLabel>
          <StatNumber>{overloadedCount}</StatNumber>
          <StatHelpText>overloaded employees</StatHelpText>
        </Stat>
      </Box>

      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm">
        <Stat>
          <StatLabel>Active Alerts</StatLabel>
          <StatNumber>{activeAlerts}</StatNumber>
          <StatHelpText>requires attention</StatHelpText>
        </Stat>
      </Box>
    </SimpleGrid>
  );
};

/**
 * Main admin dashboard
 */
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isAdmin }) => {
  const { dashboardData, isLoading, error } = useAdminDashboard(isAdmin);
  const { currentStatus, focusTime, togglePause } = useTimeTracking(
    authService.getCurrentUser()?.id
  );
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeMetrics | null>(null);
  const toast = useToast();

  const handleResolveAlert = (alertId: string) => {
    toast({
      title: 'Alert marked as resolved',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
    // TODO: Persist to backend
  };

  const handleRefresh = () => {
    // Trigger re-fetch via useEffect dependency change
    window.location.reload();
  };

  if (!isAdmin) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="red.500">Access denied. Admin only.</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box bg="red.50" p={4} borderRadius="md">
        <Text color="red.700">Failed to load dashboard: {error}</Text>
        <Button mt={2} colorScheme="red" size="sm" onClick={handleRefresh}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg">Admin Intelligence Dashboard</Heading>
          <Text fontSize="sm" color="gray.600">
            Real-time team analytics and workload management
          </Text>
        </VStack>
        <HStack spacing={2}>
          <Tooltip label={`Status: ${currentStatus}`}>
            <Button
              size="sm"
              colorScheme={currentStatus === 'ONLINE' ? 'green' : 'orange'}
              onClick={togglePause}
            >
              {currentStatus === 'PAUSE' ? '▶️ Resume' : '⏸️ Pause'}
            </Button>
          </Tooltip>
          <IconButton
            aria-label="Refresh"
            icon={<RepeatIcon />}
            size="sm"
            onClick={handleRefresh}
            isLoading={isLoading}
          />
        </HStack>
      </Flex>

      {/* Overview Stats */}
      <DashboardOverview isAdmin={isAdmin} />

      {/* Main Content */}
      <Tabs colorScheme="blue" isLazy>
        <TabList mb={4}>
          <Tab>Employees</Tab>
          <Tab>Projects</Tab>
          <Tab>
            Alerts
            {dashboardData?.alerts && dashboardData.alerts.filter((a) => !a.isResolved).length > 0 && (
              <Badge ml={2} colorScheme="red">
                {dashboardData.alerts.filter((a) => !a.isResolved).length}
              </Badge>
            )}
          </Tab>
          <Tab>Task Board</Tab>
        </TabList>

        <TabPanels>
          {/* Employees Tab */}
          <TabPanel>
            <Stack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                Click on an employee to see detailed metrics
              </Text>
              {isLoading ? (
                <Box textAlign="center" py={8}>
                  <Spinner />
                </Box>
              ) : dashboardData?.employees ? (
                <>
                  <EmployeeMetricsGrid
                    employees={dashboardData.employees}
                    onSelect={setSelectedEmployee}
                    selectedEmployeeId={selectedEmployee?.userId}
                  />

                  {/* Detailed View */}
                  {selectedEmployee && (
                    <Box bg="blue.50" p={4} borderRadius="lg" borderLeft="4px" borderLeftColor="blue.500">
                      <Heading size="sm" mb={3}>
                        Detailed Metrics: {selectedEmployee.userName}
                      </Heading>
                      <SimpleGrid columns={2} spacing={3} fontSize="sm">
                        <Box>
                          <Text color="gray.600">Last Active</Text>
                          <Text fontWeight="bold">
                            {new Date(selectedEmployee.lastActiveAt).toLocaleTimeString()}
                          </Text>
                        </Box>
                        <Box>
                          <Text color="gray.600">Average Completion Time</Text>
                          <Text fontWeight="bold">{selectedEmployee.avgCompletionTime} hours</Text>
                        </Box>
                        <Box>
                          <Text color="gray.600">Focus Score</Text>
                          <Text fontWeight="bold">
                            {selectedEmployee.dailyFocusTime} minutes ({Math.round((selectedEmployee.dailyFocusTime / 480) * 100)}%)
                          </Text>
                        </Box>
                        <Box>
                          <Text color="gray.600">Deadline Adherence</Text>
                          <Text fontWeight="bold">{selectedEmployee.deadlineAdherenceRate}%</Text>
                        </Box>
                      </SimpleGrid>
                    </Box>
                  )}
                </>
              ) : null}
            </Stack>
          </TabPanel>

          {/* Projects Tab */}
          <TabPanel>
            {isLoading ? (
              <Box textAlign="center" py={8}>
                <Spinner />
              </Box>
            ) : dashboardData?.projects ? (
              <ProjectMetricsView projects={dashboardData.projects} />
            ) : null}
          </TabPanel>

          {/* Alerts Tab */}
          <TabPanel>
            {isLoading ? (
              <Box textAlign="center" py={8}>
                <Spinner />
              </Box>
            ) : dashboardData?.alerts ? (
              <AlertsPanel
                alerts={dashboardData.alerts}
                onResolve={(alert) => handleResolveAlert(alert.id)}
              />
            ) : null}
          </TabPanel>

          {/* Task Board Tab */}
          <TabPanel>
            <Board showControls={false} showTaskActionPanel={false} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};
