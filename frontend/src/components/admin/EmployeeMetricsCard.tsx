import React from 'react';
import {
  Box,
  Flex,
  Grid,
  Heading,
  Progress,
  Badge,
  SimpleGrid,
  Card,
  CardBody,
  Stack,
  Text,
  VStack,
  HStack,
  Tooltip,
} from '@chakra-ui/react';
import { EmployeeMetrics, TimeTrackingStatus } from '../../types/analytics';

interface EmployeeMetricsCardProps {
  employee: EmployeeMetrics;
  onClick?: () => void;
  isSelected?: boolean;
}

/**
 * Individual employee metrics card
 */
export const EmployeeMetricsCard: React.FC<EmployeeMetricsCardProps> = ({
  employee,
  onClick,
  isSelected = false,
}) => {
  const statusColor: Record<TimeTrackingStatus, string> = {
    ONLINE: 'green',
    PAUSE: 'yellow',
    OFFLINE: 'gray',
  };

  const performanceColor =
    employee.performanceScore >= 80
      ? 'green'
      : employee.performanceScore >= 60
      ? 'blue'
      : employee.performanceScore >= 40
      ? 'yellow'
      : 'red';

  return (
    <Card
      cursor="pointer"
      onClick={onClick}
      borderWidth={isSelected ? '2px' : '1px'}
      borderColor={isSelected ? 'blue.500' : 'gray.200'}
      _hover={{ shadow: 'md', borderColor: 'blue.300' }}
      transition="all 0.2s"
      bg={isSelected ? 'blue.50' : 'white'}
    >
      <CardBody>
        <Stack spacing={3}>
          {/* Header */}
          <Flex justify="space-between" align="start">
            <VStack align="start" spacing={1}>
              <Heading size="sm">{employee.userName}</Heading>
              <Text fontSize="xs" color="gray.500">
                {employee.email}
              </Text>
            </VStack>
            <Tooltip label={`Status: ${employee.currentStatus}`}>
              <Badge colorScheme={statusColor[employee.currentStatus]}>
                {employee.currentStatus}
              </Badge>
            </Tooltip>
          </Flex>

          {/* Performance Score */}
          <Box>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="sm" fontWeight="medium">
                Performance
              </Text>
              <Badge colorScheme={performanceColor}>{employee.performanceScore}%</Badge>
            </Flex>
            <Progress
              value={employee.performanceScore}
              size="sm"
              colorScheme={performanceColor}
              borderRadius="md"
            />
          </Box>

          {/* Task Metrics */}
          <SimpleGrid columns={2} spacing={2} fontSize="xs">
            <Box>
              <Text color="gray.600">Completed</Text>
              <Text fontWeight="bold">{employee.tasksCompleted}</Text>
            </Box>
            <Box>
              <Text color="gray.600">Pending</Text>
              <Text fontWeight="bold">{employee.tasksPending}</Text>
            </Box>
            <Box>
              <Text color="gray.600">Completion</Text>
              <Text fontWeight="bold">{employee.completionRate}%</Text>
            </Box>
            <Box>
              <Text color="gray.600">On Time</Text>
              <Text fontWeight="bold">{employee.onTimeRate}%</Text>
            </Box>
          </SimpleGrid>

          {/* Workload */}
          <Box>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="sm" fontWeight="medium">
                Workload
              </Text>
              <Text fontSize="sm" fontWeight="bold">
                {employee.weightedLoad} pts
              </Text>
            </Flex>
            <Flex gap={1} fontSize="xs">
              {employee.isOverloaded && <Badge colorScheme="red">Overloaded</Badge>}
              {employee.isUnderutilized && <Badge colorScheme="orange">Underutilized</Badge>}
              {!employee.isOverloaded && !employee.isUnderutilized && (
                <Badge colorScheme="green">Balanced</Badge>
              )}
            </Flex>
          </Box>

          {/* Time Tracking */}
          <HStack fontSize="xs" justify="space-around">
            <VStack spacing={0}>
              <Text color="gray.600">Focus</Text>
              <Text fontWeight="bold" color="green.600">
                {employee.dailyFocusTime}m
              </Text>
            </VStack>
            <VStack spacing={0}>
              <Text color="gray.600">Pause</Text>
              <Text fontWeight="bold" color="yellow.600">
                {employee.pauseTime}m
              </Text>
            </VStack>
            <VStack spacing={0}>
              <Text color="gray.600">At Risk</Text>
              <Text fontWeight="bold" color="red.600">
                {employee.tasksAtRisk}
              </Text>
            </VStack>
          </HStack>
        </Stack>
      </CardBody>
    </Card>
  );
};

/**
 * Grid of employee metric cards
 */
interface EmployeeGridProps {
  employees: EmployeeMetrics[];
  onSelect?: (employee: EmployeeMetrics) => void;
  selectedEmployeeId?: string;
}

export const EmployeeMetricsGrid: React.FC<EmployeeGridProps> = ({
  employees,
  onSelect,
  selectedEmployeeId,
}) => {
  return (
    <Grid
      templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
      gap={4}
    >
      {employees.map((emp) => (
        <EmployeeMetricsCard
          key={emp.userId}
          employee={emp}
          onClick={() => onSelect?.(emp)}
          isSelected={emp.userId === selectedEmployeeId}
        />
      ))}
    </Grid>
  );
};
