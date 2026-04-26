import { Badge } from '@chakra-ui/react';
import { PresenceStatus } from '../../types/user';

interface AvailabilityBadgeProps {
  status?: PresenceStatus;
}

const colorByStatus: Record<PresenceStatus, string> = {
  ONLINE: 'green',
  PAUSE: 'orange',
  OFFLINE: 'gray',
};

export const AvailabilityBadge = ({ status = 'OFFLINE' }: AvailabilityBadgeProps) => (
  <Badge colorScheme={colorByStatus[status]} borderRadius="full" px={2} py={0.5}>
    {status === 'PAUSE' ? 'Paused' : status === 'ONLINE' ? 'Available' : 'Offline'}
  </Badge>
);
