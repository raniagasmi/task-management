import React, { useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Badge,
  Stack,
  Text,
  VStack,
  HStack,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
} from '@chakra-ui/react';
import { Alert, AlertType } from '../../types/analytics';
import { CloseIcon } from '@chakra-ui/icons';

interface AlertsPanelProps {
  alerts: Alert[];
  onResolve?: (alert: Alert) => void;
  isLoading?: boolean;
}

const alertTypeConfig: Record<
  AlertType,
  { icon: string; description: string; color: string }
> = {
  OVERLOADED_EMPLOYEE: {
    icon: '👤',
    description: 'Employee workload too high',
    color: 'red',
  },
  TASK_AT_RISK: {
    icon: '⏰',
    description: 'Task deadline approaching',
    color: 'yellow',
  },
  LOW_ACTIVITY: {
    icon: '😴',
    description: 'Low activity detected',
    color: 'orange',
  },
  PROJECT_DELAY: {
    icon: '📉',
    description: 'Project may be delayed',
    color: 'red',
  },
  TASK_OVERDUE: {
    icon: '🚨',
    description: 'Task is overdue',
    color: 'red',
  },
  BOTTLENECK_DETECTED: {
    icon: '🔗',
    description: 'Stuck tasks detected',
    color: 'purple',
  },
};

const severityColor: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  LOW: 'blue',
  MEDIUM: 'orange',
  HIGH: 'red',
};

/**
 * Individual alert item
 */
const AlertItem: React.FC<{ alert: Alert; onResolve?: (alert: Alert) => void }> = ({
  alert,
  onResolve,
}) => {
  const config = alertTypeConfig[alert.type];
  const toast = useToast();

  const handleResolve = () => {
    onResolve?.(alert);
    toast({
      title: 'Alert resolved',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Box
      p={3}
      borderRadius="md"
      bg={alert.isResolved ? 'gray.50' : 'white'}
      borderLeft="4px"
      borderLeftColor={`${severityColor[alert.severity]}.500`}
      opacity={alert.isResolved ? 0.6 : 1}
    >
      <Flex justify="space-between" align="start" mb={2}>
        <HStack spacing={2} flex={1}>
          <Text fontSize="lg">{config.icon}</Text>
          <VStack align="start" spacing={0}>
            <Flex gap={2} align="center">
              <Text fontWeight="bold" fontSize="sm">
                {alert.type.replace(/_/g, ' ')}
              </Text>
              <Badge colorScheme={severityColor[alert.severity]} fontSize="xs">
                {alert.severity}
              </Badge>
            </Flex>
            <Text fontSize="xs" color="gray.600">
              {config.description}
            </Text>
          </VStack>
        </HStack>
        {!alert.isResolved && onResolve && (
          <Button
            size="xs"
            colorScheme="gray"
            variant="ghost"
            onClick={handleResolve}
            rightIcon={<CloseIcon />}
          >
            Resolve
          </Button>
        )}
      </Flex>

      <Text fontSize="sm" mt={2}>
        {alert.message}
      </Text>

      <Text fontSize="xs" color="gray.400" mt={2}>
        {new Date(alert.createdAt).toLocaleString()}
      </Text>
    </Box>
  );
};

/**
 * Alerts panel with filtering by severity and type
 */
export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onResolve,
  isLoading,
}) => {
  const unresolvedAlerts = alerts.filter((a) => !a.isResolved);
  const resolvedAlerts = alerts.filter((a) => a.isResolved);

  const activeAlerts = unresolvedAlerts.length;
  const criticalAlerts = unresolvedAlerts.filter((a) => a.severity === 'HIGH').length;

  return (
    <Box bg="white" borderRadius="lg" p={4} boxShadow="sm">
      <Flex justify="space-between" align="center" mb={4}>
        <VStack align="start" spacing={0}>
          <Heading size="md">Alerts</Heading>
          <HStack spacing={3} mt={2}>
            <Badge colorScheme="red" fontSize="sm">
              {activeAlerts} Active
            </Badge>
            {criticalAlerts > 0 && (
              <Badge colorScheme="red" variant="solid" fontSize="sm">
                {criticalAlerts} Critical
              </Badge>
            )}
          </HStack>
        </VStack>
      </Flex>

      <Tabs variant="soft-rounded" defaultIndex={0}>
        <TabList mb={4}>
          <Tab>
            Active ({unresolvedAlerts.length})
          </Tab>
          <Tab>
            Resolved ({resolvedAlerts.length})
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            {unresolvedAlerts.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>
                ✅ All good! No active alerts.
              </Text>
            ) : (
              <Stack spacing={3}>
                {unresolvedAlerts.map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onResolve={onResolve}
                  />
                ))}
              </Stack>
            )}
          </TabPanel>

          <TabPanel>
            {resolvedAlerts.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>
                No resolved alerts yet.
              </Text>
            ) : (
              <Stack spacing={3}>
                {resolvedAlerts.slice(0, 10).map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onResolve={onResolve}
                  />
                ))}
              </Stack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};
