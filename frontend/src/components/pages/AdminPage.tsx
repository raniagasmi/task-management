import { useEffect, useState } from 'react';
import { Box, Badge, Heading, HStack, SimpleGrid, Stack, Text, useToast } from '@chakra-ui/react';
import TopNavbar from '../layout/TopNavbar';
import { userService } from '../../services/user.service';
import { auditService, type AuditLogEntry } from '../../services/audit.service';
import { User } from '../../types/user';

const AdminPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

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

  return (
    <Box minH="100vh" bg="linear-gradient(180deg, #f8fbff 0%, #eef4ff 45%, #f7f7fb 100%)">
      <TopNavbar />

      <Box px={{ base: 4, md: 6, xl: 10 }} py={{ base: 8, md: 12 }} maxW="1400px" mx="auto">
        <Stack spacing={3} mb={8}>
          <Badge alignSelf="flex-start" colorScheme="teal" borderRadius="full" px={3} py={1}>
            Admin console
          </Badge>
          <Heading size="xl" color="#0f172a" letterSpacing="-0.03em">
            User management and audit trail
          </Heading>
          <Text color="slate.600" maxW="70ch">
            This is the admin interface for employee management, access control, and recent privileged actions.
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mb={6}>
          <Box p={6} borderRadius="2xl" bg="white" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)">
            <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color="slate.500" mb={2}>
              Employees and admins
            </Text>
            <Heading size="md" mb={4} color="#0f172a">
              {users.length} total users
            </Heading>
            <Stack spacing={3} maxH="420px" overflowY="auto">
              {users.map((user) => (
                <HStack key={user.id} justify="space-between" p={3} borderRadius="xl" bg="slate.50">
                  <Box>
                    <Text fontWeight={700} color="#0f172a">{user.firstName} {user.lastName}</Text>
                    <Text fontSize="sm" color="slate.500">{user.email}</Text>
                  </Box>
                  <Badge colorScheme={user.role === 'admin' ? 'purple' : user.role === 'manager' ? 'blue' : 'teal'}>
                    {user.role}
                  </Badge>
                </HStack>
              ))}
            </Stack>
          </Box>

          <Box p={6} borderRadius="2xl" bg="white" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)">
            <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color="slate.500" mb={2}>
              Audit log
            </Text>
            <Heading size="md" mb={4} color="#0f172a">
              Recent privileged actions
            </Heading>
            <Stack spacing={3} maxH="420px" overflowY="auto">
              {loading ? (
                <Text color="slate.500">Loading audit trail...</Text>
              ) : logs.length === 0 ? (
                <Text color="slate.500">No audit events yet.</Text>
              ) : (
                logs.map((entry) => (
                  <Box key={entry._id ?? `${entry.action}-${entry.createdAt}`} p={3} borderRadius="xl" bg="slate.50">
                    <HStack justify="space-between" align="start" mb={2}>
                      <Text fontWeight={700} color="#0f172a">{entry.action}</Text>
                      <Badge colorScheme="teal">{entry.actorRole}</Badge>
                    </HStack>
                    <Text fontSize="sm" color="slate.600">
                      {entry.actorEmail} · {entry.resource}{entry.resourceId ? ` / ${entry.resourceId}` : ''}
                    </Text>
                  </Box>
                ))
              )}
            </Stack>
          </Box>
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default AdminPage;
