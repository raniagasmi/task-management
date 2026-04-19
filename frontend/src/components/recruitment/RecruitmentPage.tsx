import { useMemo, useState } from 'react';
import {
	Badge,
	Box,
	Button,
	Divider,
	Flex,
	Grid,
	Heading,
	Input,
	ListItem,
	Spinner,
	Stack,
	Text,
	UnorderedList,
	useToast,
} from '@chakra-ui/react';
import { JobOffer, recruitmentService } from '../../services/recruitment.service';
import SideNavbar from '../layout/SideNavbar';
import { authService } from '../../services/auth.service';
import { useNavigate } from 'react-router-dom';

type RecruitmentFlowState =
	| 'idle'
	| 'generating_job'
	| 'job_ready'
	| 'approved'
	| 'generating_post'
	| 'done';

type MessageRole = 'user' | 'assistant';

interface ChatMessage {
	id: string;
	role: MessageRole;
	content: string;
}

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const RecruitmentPage = () => {
	const navigate = useNavigate();
	const [state, setState] = useState<RecruitmentFlowState>('idle');
	const [prompt, setPrompt] = useState('');
	const [jobOffer, setJobOffer] = useState<JobOffer | null>(null);
	const [jobOfferId, setJobOfferId] = useState('');
	const [linkedinPost, setLinkedinPost] = useState('');
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			id: createMessageId(),
			role: 'assistant',
			content:
				'Hi, I am your recruitment copilot. Enter a hiring prompt and I will generate a structured job offer for approval.',
		},
	]);
	const toast = useToast();

	const handleLogout = () => {
		authService.logout();
		navigate('/login');
	};

	const sessionId = useMemo(() => {
		if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
			return crypto.randomUUID();
		}

		return `session-${Date.now()}`;
	}, []);

	const appendMessage = (role: MessageRole, content: string) => {
		setMessages((prev) => [...prev, { id: createMessageId(), role, content }]);
	};

	const resolveJobOfferId = (offer: JobOffer) => offer.id ?? offer._id ?? offer.jobOfferId ?? '';

	const handleGenerate = async () => {
		const normalizedPrompt = prompt.trim();
		if (!normalizedPrompt) {
			return;
		}

		appendMessage('user', normalizedPrompt);
		setPrompt('');
		setState('generating_job');

		try {
			const offer = await recruitmentService.generateJobOffer(normalizedPrompt);
			setJobOffer(offer);
			const resolvedId = resolveJobOfferId(offer);
			setJobOfferId(resolvedId);
			setLinkedinPost('');

			appendMessage(
				'assistant',
				resolvedId
					? 'Job offer generated. Please review the preview panel and approve it to unlock LinkedIn post generation.'
					: 'Job offer generated. Please review and approve. Warning: no jobOfferId was returned by backend, so post generation may fail until an id is available.',
			);
			setState('job_ready');
			toast({
				title: 'Job offer generated',
				status: 'success',
				duration: 2500,
				isClosable: true,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to generate job offer.';
			appendMessage('assistant', `Generation failed: ${message}`);
			setState('idle');
			toast({
				title: 'Generation failed',
				description: message,
				status: 'error',
				duration: 3000,
				isClosable: true,
			});
		}
	};

	const handleApprove = () => {
		setState('approved');
		appendMessage('assistant', 'Job offer approved. The "Generate Post" action is now enabled.');
	};

	const handleGeneratePost = async () => {
		if (!jobOfferId) {
			const warning = 'Missing jobOfferId. I cannot generate the LinkedIn post yet.';
			appendMessage('assistant', warning);
			toast({
				title: 'Missing jobOfferId',
				description: warning,
				status: 'warning',
				duration: 3000,
				isClosable: true,
			});
			return;
		}

		appendMessage('user', 'Generate post');
		setState('generating_post');

		try {
			const post = await recruitmentService.generateLinkedInPost(jobOfferId);
			setLinkedinPost(post);
			appendMessage('assistant', post);
			setState('done');
			toast({
				title: 'LinkedIn post generated',
				status: 'success',
				duration: 2500,
				isClosable: true,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to generate post.';
			appendMessage('assistant', `Post generation failed: ${message}`);
			setState('approved');
			toast({
				title: 'Post generation failed',
				description: message,
				status: 'error',
				duration: 3000,
				isClosable: true,
			});
		}
	};

	const stateColor: Record<RecruitmentFlowState, string> = {
		idle: 'gray',
		generating_job: 'blue',
		job_ready: 'teal',
		approved: 'green',
		generating_post: 'purple',
		done: 'orange',
	};

	return (
		<Flex bg="var(--light-color)" minH="100vh">
			<SideNavbar onLogoutClick={handleLogout} />
			<Stack flex={1} maxW="1400px" spacing={6} px={{ base: 4, md: 8 }} py={{ base: 6, md: 8 }}>
				<Box>
					<Heading size="lg" color="var(--font-color)">
						Recruitment AI Copilot
					</Heading>
					<Text mt={2} color="gray.500">
						Single workflow: prompt to generated job offer to approval to LinkedIn post.
					</Text>
					<Stack direction="row" mt={3} align="center">
						<Badge colorScheme={stateColor[state]}>State: {state}</Badge>
						<Badge colorScheme="blue">Session: {sessionId.slice(0, 8)}</Badge>
						{jobOfferId && <Badge colorScheme="purple">jobOfferId: {jobOfferId}</Badge>}
					</Stack>
				</Box>

				<Grid templateColumns={{ base: '1fr', lg: '1.2fr 1fr' }} gap={6} alignItems="start">
					<Box borderWidth="1px" borderRadius="lg" bg="white" p={4}>
						<Heading size="md" mb={4}>
							Copilot Chat
						</Heading>

						<Stack spacing={3} maxH="56vh" overflowY="auto" pr={1}>
							{messages.map((item) => (
								<Flex key={item.id} justify={item.role === 'user' ? 'flex-end' : 'flex-start'}>
									<Box
										maxW="86%"
										borderWidth="1px"
										borderColor={item.role === 'user' ? 'blue.200' : 'gray.200'}
										bg={item.role === 'user' ? 'blue.50' : 'gray.50'}
										borderRadius="lg"
										px={3}
										py={2}
									>
										<Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" mb={1}>
											{item.role}
										</Text>
										<Text whiteSpace="pre-wrap">{item.content}</Text>
									</Box>
								</Flex>
							))}
						</Stack>

						<Divider my={4} />

						<Stack direction={{ base: 'column', sm: 'row' }}>
							<Input
								value={prompt}
								onChange={(event) => setPrompt(event.target.value)}
								placeholder='Try: "We need a mid-level backend engineer with Node.js, MongoDB, and NestJS."'
								isDisabled={state === 'generating_job' || state === 'generating_post'}
							/>
							<Button
								colorScheme="blue"
								onClick={handleGenerate}
								isDisabled={!prompt.trim() || state === 'generating_job' || state === 'generating_post'}
								leftIcon={state === 'generating_job' ? <Spinner size="xs" /> : undefined}
							>
								Send
							</Button>
						</Stack>
					</Box>

					<Box borderWidth="1px" borderRadius="lg" bg="white" p={4}>
						<Heading size="md" mb={4}>
							Job Offer Preview
						</Heading>

						{!jobOffer ? (
							<Text color="gray.500">No generated job offer yet. Start from the chat panel.</Text>
						) : (
							<Stack spacing={4}>
								<Box>
									<Text fontSize="sm" color="gray.500">
										Title
									</Text>
									<Text fontWeight="semibold">{jobOffer.title}</Text>
								</Box>

								<Box>
									<Text fontSize="sm" color="gray.500">
										Seniority
									</Text>
									<Badge colorScheme="teal">{jobOffer.seniorityLevel}</Badge>
								</Box>

								<Box>
									<Text fontSize="sm" color="gray.500" mb={1}>
										Description
									</Text>
									<Text>{jobOffer.description}</Text>
								</Box>

								<Box>
									<Text fontSize="sm" color="gray.500" mb={1}>
										Required Skills
									</Text>
									<Flex wrap="wrap" gap={2}>
										{jobOffer.requiredSkills.map((skill) => (
											<Badge key={skill} colorScheme="blue">
												{skill}
											</Badge>
										))}
									</Flex>
								</Box>

								<Box>
									<Text fontSize="sm" color="gray.500" mb={1}>
										Responsibilities
									</Text>
									<UnorderedList pl={5}>
										{jobOffer.responsibilities.map((item) => (
											<ListItem key={item}>{item}</ListItem>
										))}
									</UnorderedList>
								</Box>

								{jobOffer.niceToHave.length > 0 && (
									<Box>
										<Text fontSize="sm" color="gray.500" mb={1}>
											Nice to Have
										</Text>
										<UnorderedList pl={5}>
											{jobOffer.niceToHave.map((item) => (
												<ListItem key={item}>{item}</ListItem>
											))}
										</UnorderedList>
									</Box>
								)}

								<Stack direction={{ base: 'column', sm: 'row' }}>
									{state === 'job_ready' && (
										<Button colorScheme="green" onClick={handleApprove}>
											Approve Job Offer
										</Button>
									)}

									{(state === 'approved' || state === 'generating_post' || state === 'done') && (
										<Button
											colorScheme="purple"
											onClick={handleGeneratePost}
											isDisabled={state === 'generating_post'}
											leftIcon={state === 'generating_post' ? <Spinner size="xs" /> : undefined}
										>
											Generate Post
										</Button>
									)}
								</Stack>

								{linkedinPost && (
									<Box>
										<Divider my={2} />
										<Text fontSize="sm" color="gray.500" mb={2}>
											LinkedIn Post
										</Text>
										<Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
											<Text whiteSpace="pre-wrap">{linkedinPost}</Text>
										</Box>
									</Box>
								)}
							</Stack>
						)}
					</Box>
				</Grid>
			</Stack>
		</Flex>
	);
};

export default RecruitmentPage;
