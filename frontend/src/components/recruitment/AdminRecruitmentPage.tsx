import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
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
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import SideNavbar from '../layout/SideNavbar';
import RecruitmentPage from './RecruitmentPage';
import { authService } from '../../services/auth.service';
import {
  ApplicationDetails,
  ApplicationStatus,
  RecruitmentJobSummary,
  recruitmentService,
} from '../../services/recruitment.service';

const PIPELINE_STATUSES: ApplicationStatus[] = ['Applied', 'Interview', 'Accepted', 'Rejected'];
const SCHEDULING_KEY = 'recruitment_slots_v1';
const BOOKING_KEY = 'recruitment_slot_bookings_v1';

interface InterviewSlot {
  id: string;
  jobOfferId: string;
  date: string;
  time: string;
  capacity: number;
}

interface SlotBooking {
  slotId: string;
  token: string;
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const AdminRecruitmentPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const detailsModal = useDisclosure();

  const [jobs, setJobs] = useState<RecruitmentJobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applications, setApplications] = useState<ApplicationDetails[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetails | null>(null);
  const [pipelineCounts, setPipelineCounts] = useState<Record<ApplicationStatus, number>>({
    Applied: 0,
    Interview: 0,
    Accepted: 0,
    Rejected: 0,
  });
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [slotCapacity, setSlotCapacity] = useState('1');

  const selectedJob = useMemo(
    () => jobs.find((item) => item.jobOfferId === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const loadJobs = useCallback(async () => {
    const nextJobs = await recruitmentService.listRecruitmentJobs();
    setJobs(nextJobs);
    if ((!selectedJobId || !nextJobs.some((job) => job.jobOfferId === selectedJobId)) && nextJobs.length > 0) {
      setSelectedJobId(nextJobs[0].jobOfferId);
    } else if (nextJobs.length === 0) {
      setSelectedJobId('');
    }
  }, [selectedJobId]);

  const loadApplications = async (jobOfferId: string, status?: ApplicationStatus) => {
    if (!jobOfferId) {
      setApplications([]);
      setPipelineCounts({ Applied: 0, Interview: 0, Accepted: 0, Rejected: 0 });
      return;
    }

    const [listPayload, pipelinePayload] = await Promise.all([
      recruitmentService.listApplicationsByJobOfferId(jobOfferId, status),
      recruitmentService.getApplicationPipelineByJobOfferId(jobOfferId),
    ]);
    setApplications(listPayload.applications);
    setPipelineCounts(pipelinePayload.counts);
  };

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!selectedJobId) return;
    const filter = statusFilter === 'All' ? undefined : statusFilter;
    void loadApplications(selectedJobId, filter);
  }, [selectedJobId, statusFilter]);

  useEffect(() => {
    const allSlots = readJson<InterviewSlot[]>(SCHEDULING_KEY, []);
    setSlots(allSlots);
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleStatusChange = async (applicationId: string, nextStatus: ApplicationStatus) => {
    try {
      await recruitmentService.updateApplicationStatus(applicationId, nextStatus);
      const filter = statusFilter === 'All' ? undefined : statusFilter;
      await loadApplications(selectedJobId, filter);
      toast({
        title: 'Status updated',
        status: 'success',
        duration: 1800,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Unable to update status',
        description: error instanceof Error ? error.message : 'Unexpected error',
        status: 'error',
        duration: 2600,
        isClosable: true,
      });
    }
  };

  const openDetails = (application: ApplicationDetails) => {
    setSelectedApplication(application);
    detailsModal.onOpen();
  };

  const handleViewApplications = async (jobOfferId: string) => {
    setSelectedJobId(jobOfferId);
    setStatusFilter('All');
    await loadApplications(jobOfferId);
  };

  const handleCloseApplications = async (jobOfferId: string) => {
    const confirmed = window.confirm('Close applications and delete this job offer?');
    if (!confirmed) {
      return;
    }

    try {
      await recruitmentService.closeJobOffer(jobOfferId);
      const nextSlots = readJson<InterviewSlot[]>(SCHEDULING_KEY, []).filter((slot) => slot.jobOfferId !== jobOfferId);
      localStorage.setItem(SCHEDULING_KEY, JSON.stringify(nextSlots));
      setSlots(nextSlots);
      if (selectedJobId === jobOfferId) {
        setApplications([]);
        setPipelineCounts({ Applied: 0, Interview: 0, Accepted: 0, Rejected: 0 });
      }
      await loadJobs();
      toast({
        title: 'Applications closed',
        status: 'success',
        duration: 1800,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Unable to close applications',
        description: error instanceof Error ? error.message : 'Unexpected error',
        status: 'error',
        duration: 2600,
        isClosable: true,
      });
    }
  };

  const handleApproveJob = async (jobOfferId: string) => {
    try {
      await recruitmentService.approveJobOffer(jobOfferId);
      await loadJobs();
      toast({
        title: 'Job offer approved',
        description: 'Candidates can now see this job offer',
        status: 'success',
        duration: 1800,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Unable to approve job offer',
        description: error instanceof Error ? error.message : 'Unexpected error',
        status: 'error',
        duration: 2600,
        isClosable: true,
      });
    }
  };

  const handleRejectJob = async (jobOfferId: string) => {
    const confirmed = window.confirm('Reject this job offer?');
    if (!confirmed) {
      return;
    }

    try {
      await recruitmentService.rejectJobOffer(jobOfferId);
      await loadJobs();
      toast({
        title: 'Job offer rejected',
        status: 'success',
        duration: 1800,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Unable to reject job offer',
        description: error instanceof Error ? error.message : 'Unexpected error',
        status: 'error',
        duration: 2600,
        isClosable: true,
      });
    }
  };

  const handleCreateSlot = () => {
    if (!selectedJobId || !slotDate || !slotTime || Number(slotCapacity) < 1) {
      toast({
        title: 'Complete all slot fields',
        status: 'warning',
        duration: 2200,
        isClosable: true,
      });
      return;
    }

    const allSlots = readJson<InterviewSlot[]>(SCHEDULING_KEY, []);
    const nextSlot: InterviewSlot = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      jobOfferId: selectedJobId,
      date: slotDate,
      time: slotTime,
      capacity: Number(slotCapacity),
    };
    const nextSlots = [nextSlot, ...allSlots];
    localStorage.setItem(SCHEDULING_KEY, JSON.stringify(nextSlots));
    setSlots(nextSlots);
    setSlotDate('');
    setSlotTime('');
    setSlotCapacity('1');
    toast({
      title: 'Interview slot created',
      status: 'success',
      duration: 1800,
      isClosable: true,
    });
  };

  const slotRows = useMemo(
    () => slots.filter((slot) => slot.jobOfferId === selectedJobId),
    [selectedJobId, slots],
  );

  const bookingRows = useMemo(() => readJson<SlotBooking[]>(BOOKING_KEY, []), []);

  return (
    <Flex minH="100vh" bg="linear-gradient(180deg, #f8fbff 0%, #eef4ff 45%, #f7f7fb 100%)">
      <SideNavbar onLogoutClick={handleLogout} />
      <Box flex={1} px={{ base: 4, md: 6, xl: 10 }} py={{ base: 8, md: 12 }} maxW="1600px" mx="auto">
        <Stack spacing={3} mb={8}>
          <Badge alignSelf="flex-start" colorScheme="teal" borderRadius="full" px={3} py={1}>
            Recruitment
          </Badge>
          <Heading size="xl" color="#0f172a" letterSpacing="-0.03em">
            Recruitment module
          </Heading>
          <Text color="slate.600" maxW="72ch">
            Manage job offers, application pipeline, ATS visibility, and interview scheduling in one place.
          </Text>
        </Stack>

        <Tabs colorScheme="teal" variant="soft-rounded" isLazy defaultIndex={0}>
          <TabList mb={6} gap={2} flexWrap="wrap">
            <Tab>AI Copilot</Tab>
            <Tab>Job Offers</Tab>
            <Tab>Applications</Tab>
            <Tab>Scheduling</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <Box borderRadius="2xl" bg="whiteAlpha.700" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)" p={{ base: 4, md: 6 }}>
                <RecruitmentPage embedded />
              </Box>
            </TabPanel>

            <TabPanel px={0}>
              <Box borderRadius="2xl" bg="white" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)" overflow="hidden">
                <HStack justify="space-between" px={6} py={5} borderBottom="1px solid" borderColor="gray.100">
                  <Heading size="md" color="#0f172a">Job offers</Heading>
                  <Button size="sm" variant="outline" onClick={() => void loadJobs()}>
                    Refresh
                  </Button>
                </HStack>
                <Box overflowX="auto">
                  <Table variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Title</Th>
                        <Th>Department</Th>
                        <Th>Date</Th>
                        <Th>Status</Th>
                        <Th>Approval</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {jobs.length === 0 ? (
                        <Tr><Td colSpan={6}><Text color="gray.500">No job offers available.</Text></Td></Tr>
                      ) : jobs.map((job) => (
                        <Tr key={job.jobOfferId}>
                          <Td fontWeight={600}>{job.title}</Td>
                          <Td>{job.department}</Td>
                          <Td>{new Date(job.postedAt).toLocaleDateString()}</Td>
                          <Td><Badge colorScheme={job.status === 'Open' ? 'green' : 'gray'}>{job.status}</Badge></Td>
                          <Td>
                            <Badge colorScheme={
                              job.approvalStatus === 'approved' ? 'green' :
                              job.approvalStatus === 'rejected' ? 'red' :
                              'orange'
                            }>
                              {job.approvalStatus ? job.approvalStatus.charAt(0).toUpperCase() + job.approvalStatus.slice(1) : 'Pending'}
                            </Badge>
                          </Td>
                          <Td>
                            <HStack spacing={2}>
                              {job.approvalStatus === 'pending' && (
                                <>
                                  <Button size="sm" colorScheme="green" variant="outline" onClick={() => void handleApproveJob(job.jobOfferId)}>
                                    Approve
                                  </Button>
                                  <Button size="sm" colorScheme="red" variant="outline" onClick={() => void handleRejectJob(job.jobOfferId)}>
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button size="sm" onClick={() => void handleViewApplications(job.jobOfferId)}>
                                View
                              </Button>
                              <Button size="sm" colorScheme="red" variant="outline" onClick={() => void handleCloseApplications(job.jobOfferId)}>
                                Delete
                              </Button>
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            </TabPanel>

            <TabPanel px={0}>
              <Stack spacing={5}>
                <Box display="none" borderRadius="2xl" bg="white" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)" overflow="hidden">
                  <HStack justify="space-between" px={6} py={5} borderBottom="1px solid" borderColor="gray.100">
                    <Heading size="md" color="#0f172a">Job offers</Heading>
                    <Button size="sm" variant="outline" onClick={() => void loadJobs()}>
                      Refresh
                    </Button>
                  </HStack>
                  <Box overflowX="auto">
                    <Table variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>Title</Th>
                          <Th>Department</Th>
                          <Th>Date</Th>
                          <Th>Status</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {jobs.length === 0 ? (
                          <Tr><Td colSpan={5}><Text color="gray.500">No job offers available.</Text></Td></Tr>
                        ) : jobs.map((job) => (
                          <Tr key={job.jobOfferId}>
                            <Td fontWeight={600}>{job.title}</Td>
                            <Td>{job.department}</Td>
                            <Td>{job.postedAt ? new Date(job.postedAt).toLocaleDateString() : '-'}</Td>
                            <Td><Badge colorScheme={job.status === 'Open' ? 'green' : 'gray'}>{job.status}</Badge></Td>
                            <Td>
                              <HStack>
                                <Button size="sm" onClick={() => void handleViewApplications(job.jobOfferId)}>
                                  View Applications
                                </Button>
                                <Button size="sm" colorScheme="red" variant="outline" onClick={() => void handleCloseApplications(job.jobOfferId)}>
                                  Close applications
                                </Button>
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </Box>

                <Box display="none" borderRadius="2xl" bg="white" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)" p={5}>
                  <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={4}>
                    <FormControl>
                      <FormLabel fontSize="sm">Job offer</FormLabel>
                      <Select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}>
                        <option value="">Select a job</option>
                        {jobs.map((job) => (
                          <option key={job.jobOfferId} value={job.jobOfferId}>{job.title}</option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Status filter</FormLabel>
                      <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ApplicationStatus | 'All')}>
                        <option value="All">All</option>
                        {PIPELINE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Pipeline totals</FormLabel>
                      <HStack>
                        <Badge colorScheme="blue">Applied {pipelineCounts.Applied}</Badge>
                        <Badge colorScheme="orange">Interview {pipelineCounts.Interview}</Badge>
                        <Badge colorScheme="green">Accepted {pipelineCounts.Accepted}</Badge>
                        <Badge colorScheme="red">Rejected {pipelineCounts.Rejected}</Badge>
                      </HStack>
                    </FormControl>
                  </Grid>
                </Box>

                <Box borderRadius="2xl" bg="white" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)" overflow="hidden">
                  <HStack justify="space-between" px={6} py={5} borderBottom="1px solid" borderColor="gray.100">
                    <Heading size="md" color="#0f172a">Applications</Heading>
                    <Text color="gray.600">{selectedJob?.title ?? 'Select a job to view applications'}</Text>
                  </HStack>
                  <Box overflowX="auto">
                    <Table variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>Candidate</Th>
                          <Th>Email</Th>
                          <Th>ATS score</Th>
                          <Th>Status</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {applications.length === 0 ? (
                          <Tr><Td colSpan={5}><Text color="gray.500">No applications yet.</Text></Td></Tr>
                        ) : applications.map((application) => (
                          <Tr key={application.applicationId}>
                            <Td fontWeight={600}>{application.candidate?.name ?? 'Unknown'}</Td>
                            <Td>{application.candidate?.email ?? '-'}</Td>
                            <Td>{application.ats?.score ?? '-'}</Td>
                            <Td>
                              <Select
                                size="sm"
                                value={application.status}
                                onChange={(event) => void handleStatusChange(application.applicationId, event.target.value as ApplicationStatus)}
                              >
                                {PIPELINE_STATUSES.map((status) => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </Select>
                            </Td>
                            <Td>
                              <HStack>
                                <Button size="sm" variant="outline" onClick={() => openDetails(application)}>
                                  View details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigate(`/application/${application.trackingToken ?? application.applicationId}`)}
                                >
                                  Candidate view
                                </Button>
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </Box>
              </Stack>
            </TabPanel>

            <TabPanel px={0}>
              <Stack spacing={5}>
                <Box borderRadius="2xl" bg="white" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)" p={6}>
                  <Heading size="md" mb={4} color="#0f172a">Create interview slot</Heading>
                  <Grid templateColumns={{ base: '1fr', md: 'repeat(4, minmax(0, 1fr))' }} gap={4}>
                    <FormControl>
                      <FormLabel fontSize="sm">Job offer</FormLabel>
                      <Select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}>
                        <option value="">Select a job</option>
                        {jobs.map((job) => (
                          <option key={job.jobOfferId} value={job.jobOfferId}>{job.title}</option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Date</FormLabel>
                      <Input type="date" value={slotDate} onChange={(event) => setSlotDate(event.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Time</FormLabel>
                      <Input type="time" value={slotTime} onChange={(event) => setSlotTime(event.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Max candidates</FormLabel>
                      <Input type="number" min={1} value={slotCapacity} onChange={(event) => setSlotCapacity(event.target.value)} />
                    </FormControl>
                  </Grid>
                  <Button mt={4} colorScheme="teal" onClick={handleCreateSlot}>Create slot</Button>
                </Box>

                <Box borderRadius="2xl" bg="white" boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)" overflow="hidden">
                  <HStack justify="space-between" px={6} py={5} borderBottom="1px solid" borderColor="gray.100">
                    <Heading size="md" color="#0f172a">Slots</Heading>
                    <Text color="gray.600">{selectedJob?.title ?? 'Select a job'}</Text>
                  </HStack>
                  <Box overflowX="auto">
                    <Table variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>Date</Th>
                          <Th>Time</Th>
                          <Th>Capacity</Th>
                          <Th>Booked</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {slotRows.length === 0 ? (
                          <Tr><Td colSpan={4}><Text color="gray.500">No slots yet.</Text></Td></Tr>
                        ) : slotRows.map((slot) => (
                          <Tr key={slot.id}>
                            <Td>{slot.date}</Td>
                            <Td>{slot.time}</Td>
                            <Td>{slot.capacity}</Td>
                            <Td>{bookingRows.filter((booking) => booking.slotId === slot.id).length}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </Box>
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <Modal isOpen={detailsModal.isOpen} onClose={detailsModal.onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Application details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {!selectedApplication ? null : (
              <Stack spacing={3}>
                <Text><strong>Candidate:</strong> {selectedApplication.candidate?.name ?? '-'}</Text>
                <Text><strong>Email:</strong> {selectedApplication.candidate?.email ?? '-'}</Text>
                <Text><strong>Job:</strong> {selectedApplication.jobOffer?.title ?? '-'}</Text>
                <Text><strong>Status:</strong> {selectedApplication.status}</Text>
                <Text><strong>ATS score:</strong> {selectedApplication.ats?.score ?? '-'}</Text>
                <Text><strong>Skills:</strong> {(selectedApplication.ats?.skills ?? []).join(', ') || '-'}</Text>
                <Text><strong>Missing skills:</strong> {(selectedApplication.ats?.missingSkills ?? []).join(', ') || '-'}</Text>
                <Text><strong>Experience summary:</strong> {selectedApplication.ats?.experienceSummary ?? '-'}</Text>
                <Text><strong>CV:</strong> {selectedApplication.cv?.originalName ?? '-'}</Text>
              </Stack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={detailsModal.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default AdminRecruitmentPage;
