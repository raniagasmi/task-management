// src/components/tasks/dnd/DeleteZone.tsx
import { Box, Icon, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Button, Tooltip, useColorModeValue, useDisclosure } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { Task as TaskType } from "../../types/task";
import { useState } from "react";
import { Trash2 } from 'lucide-react';

interface DeleteZoneProps {
  onDelete: (id: string) => Promise<void>;
}

export const DeleteZone: React.FC<DeleteZoneProps> = ({ onDelete }) => {
  const { setNodeRef, isOver } = useDroppable({ id: "delete-zone" });
  const bgColor = useColorModeValue("red.100", "red.900");
  const activeBgColor = useColorModeValue("red.200", "red.800");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [taskToDelete, setTaskToDelete] = useState<TaskType | null>(null);

  const handleDrop = (task: TaskType) => {
    setTaskToDelete(task);
    onOpen();
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      await onDelete(taskToDelete.id);
      setTaskToDelete(null);
      onClose();
    }
  };

  return (
    <>
      <Tooltip label="Delete task" hasArrow>
        <Box
          ref={setNodeRef}
          p={1}
          m={4}
          minW="56px"
          minH="56px"
          borderRadius="xl"
          bg={isOver ? activeBgColor : bgColor}
          border="1px solid"
          borderColor={isOver ? 'red.300' : 'red.200'}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          boxShadow={isOver ? '0 12px 24px rgba(239, 68, 68, 0.16)' : 'sm'}
          transition="all 0.2s ease"
          onDrop={(e) => {
            const task = JSON.parse(e.dataTransfer.getData("application/json")) as TaskType;
            handleDrop(task);
          }}
          _hover={{ transform: 'translateY(-1px)' }}
        >
          <Icon as={Trash2} boxSize={5} color="red.500" />
        </Box>
      </Tooltip>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalBody>Are you sure you want to delete this task?</ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={confirmDelete}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};