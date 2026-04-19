import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { User } from '../../types/user';
import { CreateConversationPayload } from '../../services/collaboration.service';

interface CreateConversationModalProps {
  isOpen: boolean;
  isLoading: boolean;
  users: User[];
  onClose: () => void;
  onSubmit: (payload: CreateConversationPayload) => void;
}

const initialForm = {
  title: '',
  prompt: '',
  members: [] as string[],
};

const CreateConversationModal = ({ isOpen, isLoading, users, onClose, onSubmit }: CreateConversationModalProps) => {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!isOpen) {
      setForm(initialForm);
    }
  }, [isOpen]);

  const selectedUsers = useMemo(
    () => users.filter((user) => form.members.includes(user.id)),
    [form.members, users],
  );

  const handleSubmit = () => {
    onSubmit({
      title: form.title.trim(),
      prompt: form.prompt.trim(),
      members: form.members,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
      <ModalContent borderRadius="2xl">
        <ModalHeader>Create collaboration project</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Project name</FormLabel>
              <Input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Customer portal redesign"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Prompt</FormLabel>
              <Textarea
                value={form.prompt}
                onChange={(event) => setForm((prev) => ({ ...prev, prompt: event.target.value }))}
                placeholder="Describe the project so AI can generate balanced task proposals"
                minH="120px"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Select users</FormLabel>
              <Box borderWidth="1px" borderRadius="xl" p={4} maxH="260px" overflowY="auto">
                <CheckboxGroup
                  value={form.members}
                  onChange={(value) => setForm((prev) => ({ ...prev, members: value as string[] }))}
                >
                  <Stack spacing={3}>
                    {users.map((user) => (
                      <Checkbox key={user.id} value={user.id}>
                        <Stack spacing={0} ml={2}>
                          <Text fontWeight="600">
                            {user.firstName} {user.lastName}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            {user.email}
                          </Text>
                        </Stack>
                      </Checkbox>
                    ))}
                  </Stack>
                </CheckboxGroup>
              </Box>
            </FormControl>

            {selectedUsers.length > 0 && (
              <Box>
                <Text fontSize="sm" color="gray.500" mb={2}>
                  Selected users
                </Text>
                <Stack direction="row" wrap="wrap">
                  {selectedUsers.map((user) => (
                    <Badge key={user.id} colorScheme="teal" borderRadius="full" px={3} py={1}>
                      {user.firstName} {user.lastName}
                    </Badge>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </ModalBody>

        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button
            colorScheme="teal"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={!form.title.trim() || !form.prompt.trim() || form.members.length === 0}
          >
            Create and generate tasks
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreateConversationModal;
