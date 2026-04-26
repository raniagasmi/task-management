import { useEffect } from 'react';
import { Box, Button, HStack, Text, useToast } from '@chakra-ui/react';
import { collaborationSocket } from '../../services/collaboration.socket';
import { workspacePreferencesService } from '../../services/workspace-preferences.service';
import { taskService } from '../../services/task.service';
import { TaskStatus } from '../../types/task';

export const TaskReminderToasts = () => {
  const toast = useToast();

  useEffect(() => {
    const unsubscribe = collaborationSocket.onTaskReminder((payload) => {
      if (!workspacePreferencesService.shouldDeliver('reminders')) {
        return;
      }

      const id = `task-reminder-${payload.reminderId}`;
      toast({
        id,
        duration: 9000,
        isClosable: true,
        position: 'bottom-right',
        render: () => (
          <Box bg="white" borderRadius="2xl" boxShadow="lg" p={4} border="1px solid" borderColor="teal.100">
            <Text fontWeight="700" color="slate.800">Task reminder</Text>
            <Text mt={1} color="slate.600">
              {payload?.taskTitle ? payload.taskTitle : 'You have a task reminder.'}
            </Text>
            <HStack mt={4} spacing={2} wrap="wrap">
              <Button
                size="sm"
                colorScheme="green"
                onClick={() => {
                  void taskService.updateTaskStatus(payload.taskId, TaskStatus.DONE);
                  toast.close(id);
                }}
              >
                Mark done
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void taskService.createTaskReminder(payload.taskId, new Date(Date.now() + 15 * 60 * 1000));
                  toast.close(id);
                }}
              >
                Snooze 15m
              </Button>
              <Button
                size="sm"
                variant="outline"
                colorScheme="blue"
                onClick={() => {
                  void taskService.createTaskReminder(payload.taskId, new Date(Date.now() + 60 * 60 * 1000));
                  toast.close(id);
                }}
              >
                Reschedule 1h
              </Button>
            </HStack>
          </Box>
        ),
      });
    });

    return unsubscribe;
  }, [toast]);

  return null;
};
