// src/components/tasks/dnd/ArchiveZone.tsx
import { Box, Icon, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Button, Tooltip, useColorModeValue, useDisclosure } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { Task as TaskType } from "../../types/task";
import { useState } from "react";
import { Archive } from 'lucide-react';

interface ArchiveZoneProps {
  onArchive: (id: string) => Promise<void>;
}

export const ArchiveZone: React.FC<ArchiveZoneProps> = ({ onArchive }) => {
  const { setNodeRef, isOver } = useDroppable({ id: "archive-zone" });
  const bgColor = useColorModeValue("orange.100", "orange.900");
  const activeBgColor = useColorModeValue("orange.200", "orange.800");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [taskToArchive, setTaskToArchive] = useState<TaskType | null>(null);

  const handleDrop = (task: TaskType) => {
    setTaskToArchive(task);
    onOpen();
  };

  const confirmArchive = async () => {
    if (taskToArchive) {
      await onArchive(taskToArchive.id);
      setTaskToArchive(null);
      onClose();
    }
  };

  return (
    <>
      <Tooltip label="Archive task" hasArrow>
        <Box
          ref={setNodeRef}
          p={1}
          m={4}
          minW="56px"
          minH="56px"
          borderRadius="xl"
          bg={isOver ? activeBgColor : bgColor}
          border="1px solid"
          borderColor={isOver ? 'orange.300' : 'orange.200'}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          boxShadow={isOver ? '0 12px 24px rgba(249, 115, 22, 0.16)' : 'sm'}
          transition="all 0.2s ease"
          onDrop={(e) => {
            const task = JSON.parse(e.dataTransfer.getData("application/json")) as TaskType;
            handleDrop(task);
          }}
          _hover={{ transform: 'translateY(-1px)' }}
        >
          <Icon as={Archive} boxSize={5} color="orange.500" />
        </Box>
      </Tooltip>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Archive</ModalHeader>
          <ModalBody>Are you sure you want to archive this task?</ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="orange" onClick={confirmArchive}>
              Archive
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};