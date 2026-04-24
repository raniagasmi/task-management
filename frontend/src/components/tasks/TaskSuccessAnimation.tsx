import React, { useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const popIn = keyframes`
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const celebrate = keyframes`
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) scale(0);
    opacity: 0;
  }
`;

interface TaskSuccessAnimationProps {
  show: boolean;
  taskTitle: string;
  onComplete?: () => void;
}

/**
 * Success animation when task is moved to DONE
 */
export const TaskSuccessAnimation: React.FC<TaskSuccessAnimationProps> = ({
  show,
  taskTitle,
  onComplete,
}) => {
  useEffect(() => {
    if (!show) return;

    const timer = setTimeout(() => {
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <Box
      position="fixed"
      top="50%"
      left="50%"
      transform="translateX(-50%)"
      zIndex={9999}
      pointerEvents="none"
    >
      {/* Main celebration box */}
      <Box
        bg="green.100"
        border="2px solid"
        borderColor="green.500"
        borderRadius="lg"
        p={4}
        textAlign="center"
        animation={`${popIn} 0.5s ease-out`}
        mb={2}
      >
        <Box fontSize="3xl" mb={2}>
          ✨🎉✨
        </Box>
        <Box fontWeight="bold" color="green.700">
          Task Complete!
        </Box>
        <Box fontSize="sm" color="green.600">
          {taskTitle}
        </Box>
      </Box>

      {/* Floating particles */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Box
          key={i}
          position="absolute"
          fontSize="2xl"
          animation={`${celebrate} 1.5s ease-out forwards`}
          style={{
            left: `${Math.cos((i / 5) * Math.PI * 2) * 50}px`,
            top: `${Math.sin((i / 5) * Math.PI * 2) * 50}px`,
            animationDelay: `${i * 0.1}s`,
          }}
        >
          {['⭐', '🎊', '✨', '🎈', '🏆'][i]}
        </Box>
      ))}
    </Box>
  );
};
