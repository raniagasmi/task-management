import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { DeleteIcon, EditIcon, Search2Icon, ViewIcon } from '@chakra-ui/icons';
import SideNavbar from '../layout/SideNavbar';
import { userService } from '../../services/user.service';
import { auditService, type AuditLogEntry } from '../../services/audit.service';
import { User, UserRole } from '../../types/user';
import { authService } from '../../services/auth.service';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
	const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', role: UserRole.EMPLOYEE });
  const toast = useToast();
  const detailsModal = useDisclosure();
  const logsModal = useDisclosure();
  const editModal = useDisclosure();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allUsers, auditLogs] = await Promise.all([
          userService.getAllUsers(),
          auditService.getAuditLogs(),
        ]);

        setUsers(allUsers);
        setLogs(auditLogs);
      } catch (error) {
        console.error('Failed to load admin data:', error);
        toast({
          title: 'Unable to load admin dashboard',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const filteredLogs = useMemo(() => {
    if (!selectedUser) {
      return logs;
    }

    return logs.filter((entry) => {
      const byEmail = entry.actorEmail?.toLowerCase() === selectedUser.email?.toLowerCase();
      const byId = entry.actorId === selectedUser.id || entry.resourceId === selectedUser.id;
      return byEmail || byId;
    });
  }, [logs, selectedUser]);

  const openDetails = (user: User) => {
    setSelectedUser(user);
    detailsModal.onOpen();
  };

  const openLogs = (user: User) => {
    setSelectedUser(user);
    logsModal.onOpen();
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
    editModal.onOpen();
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) {
      return;
    }

    try {
      await userService.updateUserById(selectedUser.id, editForm);
      const [allUsers, auditLogs] = await Promise.all([
        userService.getAllUsers(),
        auditService.getAuditLogs(),
      ]);
      setUsers(allUsers);
      setLogs(auditLogs);
      editModal.onClose();
      toast({
        title: 'User updated',
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to update user:', error);
      toast({
        title: 'Failed to update user',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(`Delete ${user.firstName} ${user.lastName}?`);
    if (!confirmed) {
      return;
    }

    try {
      await userService.deleteUser(user.id);
      const [allUsers, auditLogs] = await Promise.all([
        userService.getAllUsers(),
        auditService.getAuditLogs(),
      ]);
      setUsers(allUsers);
      setLogs(auditLogs);
      toast({
        title: 'User deleted',
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        title: 'Failed to delete user',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Flex minH="100vh" bg="linear-gradient(180deg, #f8fbff 0%, #eef4ff 45%, #f7f7fb 100%)">
      <SideNavbar onLogoutClick={handleLogout} />

      <Box flex={1} px={{ base: 4, md: 6, xl: 10 }} py={{ base: 8, md: 12 }} maxW="1400px" mx="auto">
        <Stack spacing={3} mb={8}>
          <Badge alignSelf="flex-start" colorScheme="teal" borderRadius="full" px={3} py={1}>
            Admin console
          </Badge>
          <Heading size="xl" color="#0f172a" letterSpacing="-0.03em">
            User management and audit trail
          </Heading>
          <Text color="slate.600" maxW="70ch">
            Manage all users from one dashboard with quick actions for details, logs, updates, and deletion.
          </Text>
        </Stack>

        <Box borderRadius="2xl" bg="white" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)" overflow="hidden">
          <HStack justify="space-between" px={6} py={5} borderBottom="1px solid" borderColor="gray.100">
            <Heading size="md" color="#0f172a">Employees and admins</Heading>
            <Badge colorScheme="teal">{users.length} users</Badge>
          </HStack>

          <Box overflowX="auto">
            <Table variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th textAlign="right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={4}><Text color="gray.500">Loading users...</Text></Td>
                  </Tr>
                ) : users.length === 0 ? (
                  <Tr>
                    <Td colSpan={4}><Text color="gray.500">No users found.</Text></Td>
                  </Tr>
                ) : (
                  users.map((user) => (
                    <Tr key={user.id}>
                      <Td fontWeight={600}>{user.firstName} {user.lastName}</Td>
                      <Td>{user.email}</Td>
                      <Td>
                        <Badge colorScheme={user.role === UserRole.ADMIN ? 'purple' : user.role === UserRole.MANAGER ? 'blue' : 'teal'}>
                          {user.role}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack justify="flex-end" spacing={2}>
                          <Tooltip label="See details">
                            <IconButton aria-label="See details" icon={<ViewIcon />} size="sm" variant="outline" onClick={() => openDetails(user)} />
                          </Tooltip>
                          <Tooltip label="See audit logs">
                            <IconButton aria-label="See audit logs" icon={<Search2Icon />} size="sm" variant="outline" onClick={() => openLogs(user)} />
                          </Tooltip>
                          <Tooltip label="Update user">
                            <IconButton aria-label="Update user" icon={<EditIcon />} size="sm" variant="outline" onClick={() => openEdit(user)} />
                          </Tooltip>
                          <Tooltip label="Delete user">
                            <IconButton aria-label="Delete user" icon={<DeleteIcon />} size="sm" variant="outline" colorScheme="red" onClick={() => handleDelete(user)} />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>

        <Modal isOpen={detailsModal.isOpen} onClose={detailsModal.onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>User details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedUser && (
                <VStack align="stretch" spacing={3}>
                  <Text><strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}</Text>
                  <Text><strong>Email:</strong> {selectedUser.email}</Text>
                  <Text><strong>Role:</strong> {selectedUser.role}</Text>
                  <Text><strong>Created:</strong> {new Date(selectedUser.createdAt).toLocaleString()}</Text>
                  <Text><strong>Updated:</strong> {new Date(selectedUser.updatedAt).toLocaleString()}</Text>
                </VStack>
              )}
            </ModalBody>
            <ModalFooter>
              <Button onClick={detailsModal.onClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal isOpen={logsModal.isOpen} onClose={logsModal.onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Audit logs</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Stack spacing={3} maxH="60vh" overflowY="auto">
                {filteredLogs.length === 0 ? (
                  <Text color="gray.500">No audit entries for this user yet.</Text>
                ) : (
                  filteredLogs.map((entry) => (
                    <Box key={entry._id ?? `${entry.action}-${entry.createdAt}`} p={3} borderRadius="lg" bg="gray.50">
                      <HStack justify="space-between" mb={1}>
                        <Text fontWeight={700}>{entry.action}</Text>
                        <Badge colorScheme="teal">{entry.actorRole}</Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">{entry.actorEmail}</Text>
                      <Text fontSize="sm" color="gray.600">{entry.resource}{entry.resourceId ? ` / ${entry.resourceId}` : ''}</Text>
                      {entry.createdAt && <Text fontSize="xs" color="gray.500">{new Date(entry.createdAt).toLocaleString()}</Text>}
                    </Box>
                  ))
                )}
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={logsModal.onClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal isOpen={editModal.isOpen} onClose={editModal.onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Update user</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Stack spacing={3}>
                <FormControl>
                  <FormLabel>First name</FormLabel>
                  <Input value={editForm.firstName} onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))} />
                </FormControl>
                <FormControl>
                  <FormLabel>Last name</FormLabel>
                  <Input value={editForm.lastName} onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))} />
                </FormControl>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input value={editForm.email} onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))} />
                </FormControl>
                <FormControl>
                  <FormLabel>Role</FormLabel>
                  <Select value={editForm.role} onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}>
                    <option value={UserRole.ADMIN}>admin</option>
                    <option value={UserRole.MANAGER}>manager</option>
                    <option value={UserRole.EMPLOYEE}>employee</option>
                  </Select>
                </FormControl>
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={editModal.onClose}>Cancel</Button>
              <Button colorScheme="teal" onClick={handleSaveEdit}>Save</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </Flex>
  );
};

export default AdminPage;
