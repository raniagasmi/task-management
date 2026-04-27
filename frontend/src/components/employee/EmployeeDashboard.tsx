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
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { dashboardService } from '../../services/dashboard.service';
import type { EmployeeDashboardResponse } from '../../types/dashboard';
import { AlertsPanel } from '../admin/AlertsPanel';
import { Board } from '../tasks/Board';
import { authService } from '../../services/auth.service';
import { useTimeTracking } from '../../hooks/useAdminMetrics';

export const EmployeeDashboard = () => {
  const currentUserId = authService.getCurrentUser()?.id;
  const { currentStatus, togglePause } = useTimeTracking(currentUserId);

  const [data, setData] = useState<EmployeeDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

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
        <Tabs colorScheme="blue" isLazy>
          <TabList mb={4}>
            <Tab>Employees</Tab>
            <Tab>Projects</Tab>
            <Tab>
              Alerts
              {data.alerts.filter((a) => !a.isResolved).length > 0 && (
                <Badge ml={2} colorScheme="red">
                  {data.alerts.filter((a) => !a.isResolved).length}
                </Badge>
              )}
            </Tab>
            <Tab>Task Board</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
                <Heading size="md" mb={3}>
                  Same-Project Directory
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
              <AlertsPanel alerts={data.alerts} />
            </TabPanel>

            <TabPanel>
              <Board showControls={false} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </Box>
  );
};
