import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../../services/auth.service";
import axios from "axios";
import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Alert,
  AlertIcon,
  Text,
  useToast,
  Flex,
  Heading,
  Stack,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { CheckCircleIcon, ChatIcon, TimeIcon } from "@chakra-ui/icons";

const Login = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(""); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password");
      return;
    }
  
    setError("");
    setLoading(true);
  
    try {
      await authService.login(formData);
  
      if (!authService.isAuthenticated()) {
        throw new Error("Login failed - please try again");
      }
  
      toast({
        title: "Login successful!",
        description: "Welcome back!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
  
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      
      // Type-safe error handling
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Login failed");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to login. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      align="stretch"
      justify="center"
      minH="100vh"
      bg="linear-gradient(160deg, #28282D 0%, #333339 60%, #2d2d34 100%)"
      px={{ base: 4, md: 8 }}
      py={{ base: 6, md: 10 }}
    >
      <Flex
        w="100%"
        maxW="1200px"
        mx="auto"
        direction={{ base: "column", lg: "row" }}
        borderRadius="3xl"
        overflow="hidden"
        border="1px solid rgba(216,216,219,0.14)"
        boxShadow="0 25px 80px rgba(0,0,0,0.35)"
        bg="rgba(40,40,45,0.66)"
        backdropFilter="blur(8px)"
      >
        <Box
          flex={{ base: "0", lg: "1" }}
          minH={{ base: "260px", lg: "auto" }}
          p={{ base: 6, md: 10 }}
          position="relative"
          bg="linear-gradient(180deg, rgba(40,40,45,0.95) 0%, rgba(51,51,57,0.9) 100%)"
          borderRight={{ base: "none", lg: "1px solid rgba(216,216,219,0.12)" }}
        >
          <Badge
            colorScheme="teal"
            variant="subtle"
            px={3}
            py={1}
            borderRadius="full"
            mb={4}
          >
            Smart Team Workspace
          </Badge>
          <Heading size={{ base: "lg", md: "xl" }} color="#D8D8DB" mb={3} lineHeight="1.1">
            Run Tasks and Recruitment in One Calm Flow
          </Heading>
          <Text color="rgba(216,216,219,0.82)" maxW="42ch" mb={8}>
            Manage day-to-day priorities, track hiring updates, and keep the whole team aligned from one focused platform.
          </Text>

          <Stack spacing={4}>
            <HStack spacing={3} p={3} borderRadius="xl" bg="rgba(216,216,219,0.08)">
              <Icon as={TimeIcon} color="teal.300" />
              <Text color="#D8D8DB" fontSize="sm">Task timeline always visible and up to date</Text>
            </HStack>
            <HStack spacing={3} p={3} borderRadius="xl" bg="rgba(216,216,219,0.08)">
              <Icon as={ChatIcon} color="teal.300" />
              <Text color="#D8D8DB" fontSize="sm">Recruitment copilots ready for HR workflows</Text>
            </HStack>
            <HStack spacing={3} p={3} borderRadius="xl" bg="rgba(216,216,219,0.08)">
              <Icon as={CheckCircleIcon} color="teal.300" />
              <Text color="#D8D8DB" fontSize="sm">Collaboration signals that keep teams moving</Text>
            </HStack>
          </Stack>

          <Box
            position="absolute"
            bottom="-60px"
            right="-40px"
            w="200px"
            h="200px"
            borderRadius="full"
            bg="rgba(49, 151, 149, 0.22)"
            filter="blur(8px)"
          />
        </Box>

        <Box flex={{ base: "1", lg: "0.9" }} p={{ base: 6, md: 10 }} bg="rgba(40,40,45,0.82)">
          <Heading mb={2} textAlign="left" size="lg" color="#D8D8DB">
            Welcome back
          </Heading>
          <Text mb={6} color="rgba(216,216,219,0.78)">
            Log in to continue organizing your workspace.
          </Text>

          {error && (
            <Alert status="error" mb={4} borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="rgba(216,216,219,0.9)">Email</FormLabel>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  isDisabled={loading}
                  autoComplete="email"
                  autoFocus
                  bg="rgba(216,216,219,0.08)"
                  borderColor="rgba(216,216,219,0.26)"
                  color="#D8D8DB"
                  _placeholder={{ color: "rgba(216,216,219,0.52)" }}
                  _hover={{ borderColor: "teal.300" }}
                  _focusVisible={{ borderColor: "teal.300", boxShadow: "0 0 0 1px #4fd1c5" }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="rgba(216,216,219,0.9)">Password</FormLabel>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  isDisabled={loading}
                  autoComplete="current-password"
                  bg="rgba(216,216,219,0.08)"
                  borderColor="rgba(216,216,219,0.26)"
                  color="#D8D8DB"
                  _placeholder={{ color: "rgba(216,216,219,0.52)" }}
                  _hover={{ borderColor: "teal.300" }}
                  _focusVisible={{ borderColor: "teal.300", boxShadow: "0 0 0 1px #4fd1c5" }}
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="teal"
                width="full"
                isLoading={loading}
                loadingText="Logging in..."
                mt={2}
              >
                Login
              </Button>

              <Text color="rgba(216,216,219,0.78)">
                Don&apos;t have an account?{" "}
                <Link to="/register" style={{ color: "#4fd1c5", fontWeight: 600 }}>
                  Register here
                </Link>
              </Text>
            </VStack>
          </form>
        </Box>
      </Flex>
    </Flex>
  );
};

export default Login;
