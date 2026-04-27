import { useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { collaborationSocket } from '../../services/collaboration.socket';

export const TaskReminderToasts = () => {
  const toast = useToast();

  useEffect(() => {
    const unsubscribe = collaborationSocket.onTaskReminder((payload) => {
      toast({
        title: 'Task reminder',
        description: payload?.taskTitle ? payload.taskTitle : 'You have a task reminder.',
        status: 'info',
        duration: 6000,
        isClosable: true,
      });
    });

    return unsubscribe;
  }, [toast]);

  return null;
};

