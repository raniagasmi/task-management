import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  ListItem,
  Stack,
  Text,
  UnorderedList,
  useToast,
} from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApplicationDetails, recruitmentService } from '../../services/recruitment.service';

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

const CandidateApplicationPage = () => {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [error, setError] = useState('');
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [bookings, setBookings] = useState<SlotBooking[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const payload = await recruitmentService.trackApplication(token);
        setApplication(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load application.');
      }
    };
    void load();
  }, [token]);

  useEffect(() => {
    setSlots(readJson<InterviewSlot[]>(SCHEDULING_KEY, []));
    setBookings(readJson<SlotBooking[]>(BOOKING_KEY, []));
  }, []);

  const pipelineStages = ['Applied', 'Interview', 'Accepted', 'Rejected'];

  const jobSlots = useMemo(() => {
    if (!application?.jobOffer?.jobOfferId) return [];
    return slots.filter((slot) => slot.jobOfferId === application.jobOffer?.jobOfferId);
  }, [application?.jobOffer?.jobOfferId, slots]);

  const currentBooking = useMemo(
    () => bookings.find((booking) => booking.token === token),
    [bookings, token],
  );

  const isSlotAvailable = (slot: InterviewSlot) => {
    const used = bookings.filter((item) => item.slotId === slot.id).length;
    const alreadyBookedByCandidate = bookings.some((item) => item.slotId === slot.id && item.token === token);
    return alreadyBookedByCandidate || used < slot.capacity;
  };

  const selectSlot = (slot: InterviewSlot) => {
    if (!isSlotAvailable(slot)) {
      toast({
        title: 'Slot already full',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    const next = bookings.filter((entry) => entry.token !== token);
    next.push({ slotId: slot.id, token });
    localStorage.setItem(BOOKING_KEY, JSON.stringify(next));
    setBookings(next);
    toast({
      title: 'Interview slot confirmed',
      status: 'success',
      duration: 2200,
      isClosable: true,
    });
  };

  const selectedSlot = currentBooking
    ? jobSlots.find((slot) => slot.id === currentBooking.slotId)
    : null;

  return (
    <Flex minH="100vh" bg="linear-gradient(180deg, #f8fbff 0%, #eef4ff 45%, #f7f7fb 100%)" py={{ base: 8, md: 12 }}>
      <Container maxW="4xl">
        <Stack spacing={6}>
          <HStack justify="space-between">
            <Heading size="lg" color="#0f172a">Application tracking</Heading>
            <Button variant="outline" onClick={() => navigate('/')}>Home</Button>
          </HStack>

          {error ? (
            <Box borderRadius="xl" bg="white" p={6} boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)">
              <Text color="red.600">{error}</Text>
            </Box>
          ) : !application ? (
            <Box borderRadius="xl" bg="white" p={6} boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)">
              <Text color="gray.600">Loading application...</Text>
            </Box>
          ) : (
            <>
              <Box borderRadius="2xl" bg="white" p={6} boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)">
                <Stack spacing={3}>
                  <Text><strong>Job title:</strong> {application.jobOffer?.title ?? '-'}</Text>
                  <Text><strong>Status:</strong> {application.status}</Text>
                  <Text><strong>ATS score:</strong> {application.ats?.score ?? '-'}</Text>
                  <Text><strong>Skills:</strong> {(application.ats?.skills ?? []).join(', ') || '-'}</Text>
                  <Text><strong>Missing skills:</strong> {(application.ats?.missingSkills ?? []).join(', ') || '-'}</Text>
                </Stack>
              </Box>

              <Box borderRadius="2xl" bg="white" p={6} boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)">
                <Heading size="sm" mb={3} color="#0f172a">Pipeline stage</Heading>
                <HStack spacing={2} flexWrap="wrap">
                  {pipelineStages.map((stage) => (
                    <Badge
                      key={stage}
                      px={3}
                      py={1}
                      borderRadius="full"
                      colorScheme={stage === application.status ? 'teal' : 'gray'}
                    >
                      {stage}
                    </Badge>
                  ))}
                </HStack>
              </Box>

              <Box borderRadius="2xl" bg="white" p={6} boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)">
                <Heading size="sm" mb={4} color="#0f172a">Interview scheduling</Heading>
                {jobSlots.length === 0 ? (
                  <Text color="gray.600">No available interview slots yet.</Text>
                ) : (
                  <Stack spacing={3}>
                    {jobSlots.map((slot) => {
                      const available = isSlotAvailable(slot);
                      const isSelected = selectedSlot?.id === slot.id;
                      const used = bookings.filter((item) => item.slotId === slot.id).length;
                      return (
                        <Box key={slot.id} borderWidth="1px" borderColor={isSelected ? 'teal.400' : 'gray.200'} borderRadius="lg" p={4}>
                          <HStack justify="space-between" align="center">
                            <Box>
                              <Text fontWeight={600}>{slot.date} at {slot.time}</Text>
                              <Text fontSize="sm" color="gray.600">{used}/{slot.capacity} booked</Text>
                            </Box>
                            <Button
                              size="sm"
                              colorScheme={isSelected ? 'teal' : 'blue'}
                              variant={isSelected ? 'solid' : 'outline'}
                              isDisabled={!available}
                              onClick={() => selectSlot(slot)}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </Button>
                          </HStack>
                        </Box>
                      );
                    })}
                  </Stack>
                )}

                {selectedSlot && (
                  <Box mt={4} borderRadius="lg" bg="teal.50" p={4}>
                    <Text color="teal.700">
                      Your interview is scheduled for {selectedSlot.date} at {selectedSlot.time}.
                    </Text>
                  </Box>
                )}
              </Box>

              <Box borderRadius="2xl" bg="white" p={6} boxShadow="0 18px 45px rgba(15, 23, 42, 0.08)">
                <Heading size="sm" mb={3} color="#0f172a">Experience summary</Heading>
                <Text color="gray.700">{application.ats?.experienceSummary ?? '-'}</Text>
                <Text mt={4} fontWeight={600}>Missing skills detail</Text>
                <UnorderedList pl={5}>
                  {(application.ats?.missingSkills ?? []).length === 0 ? (
                    <ListItem>None</ListItem>
                  ) : (
                    application.ats?.missingSkills.map((skill) => (
                      <ListItem key={skill}>{skill}</ListItem>
                    ))
                  )}
                </UnorderedList>
              </Box>
            </>
          )}
        </Stack>
      </Container>
    </Flex>
  );
};

export default CandidateApplicationPage;
