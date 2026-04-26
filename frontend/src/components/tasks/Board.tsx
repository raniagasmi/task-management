import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Flex,
  Heading,
  Input,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  Textarea,
  useToast,
  VStack,
  IconButton,
  Text,
  Badge,
  HStack,
} from "@chakra-ui/react";
import { RepeatIcon, ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import {
  DndContext,
  closestCorners,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { taskService, UpdateTaskDto } from "../../services/task.service";
import { userService } from "../../services/user.service";
import { Task as TaskType, TaskDecisionStatus, TaskPriority, TaskStatus } from "../../types/task";
import { User, UserRole } from "../../types/user";
import Column from "./Column";
import Task from "./Task";
import { ArchiveZone } from "./ArchiveZone";
import { DeleteZone } from "./DeleteZone";
import { TaskSuccessAnimation } from "./TaskSuccessAnimation";
import { statusOrder } from "./Task.constants";
import { useTimeTracking } from "../../hooks/useAdminMetrics";

interface BoardData {
  [status: string]: TaskType[];
}

interface BoardProps {
  showControls?: boolean;
  employeeInteractionOnly?: boolean;
  onEmployeeTaskSelect?: (task: TaskType) => void;
}

export const Board: React.FC<BoardProps> = ({
  showControls = true,
  employeeInteractionOnly = false,
  onEmployeeTaskSelect,
}) => {
  const [boardData, setBoardData] = useState<BoardData>({
    TODO: [],
    IN_PROGRESS: [],
    DONE: [],
  });
  const [loading, setLoading] = useState(true);
  const [archivedTasks, setArchivedTasks] = useState<TaskType[]>([]);
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [successAnimation, setSuccessAnimation] = useState<{ show: boolean; title: string }>({
    show: false,
    title: "",
  });
  const { currentStatus, togglePause } = useTimeTracking(currentUserId);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currentTask, setCurrentTask] = useState<Partial<TaskType> | null>(null);
  const toast = useToast();

  useEffect(() => {
    const getCurrentUserInfo = async () => {
      try {
        const user = await userService.getCurrentUser();
        setUserRole(user.role);
        setCurrentUserId(user.id);
        if (user.role === UserRole.ADMIN) {
          const users = await userService.getAllUsers();
          setAssignableUsers(users);
        }
      } catch (error) {
        console.error("Failed to get user info:", error);
      }
    };
    void getCurrentUserInfo();
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const tasks = await taskService.getAllTasks();

      let filteredTasks = tasks;
      if (userRole !== UserRole.ADMIN && currentUserId) {
        filteredTasks = tasks.filter((task) => task.assignedTo === currentUserId);
      }

      const activeOnly = filteredTasks.filter((task) => task.active !== false);
      const archivedOnly = filteredTasks.filter((task) => task.active === false);
      const groupedTasks = activeOnly.reduce((acc, task) => {
        acc[task.status] = [...(acc[task.status] || []), task];
        return acc;
      }, { TODO: [], IN_PROGRESS: [], DONE: [] } as BoardData);

      setBoardData(groupedTasks);
      setArchivedTasks(archivedOnly);
    } catch (error) {
      toast({
        title: "Error fetching tasks",
        description: error instanceof Error ? error.message : "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [currentUserId, toast, userRole]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = [...Object.values(boardData).flat(), ...archivedTasks].find((item) => item.id === active.id);
    if (task) {
      console.log("Task data for drag start:", task);
    }
  };

  const updateTaskOrders = async (tasks: TaskType[]) => {
    await Promise.all(tasks.map((task, index) => taskService.updateTaskOrder(task.id, index)));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (over.id === "delete-zone") {
      const confirmDelete = window.confirm("Are you sure you want to delete this task?");
      if (!confirmDelete) return;
      await handleDeleteTask(active.id as string);
      return;
    }

    if (over.id === "archive-zone") {
      const confirmArchive = window.confirm("Are you sure you want to archive this task?");
      if (!confirmArchive) return;
      await handleArchiveTask(active.id as string);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const sourceColumn = Object.keys(boardData).find((status) =>
      boardData[status as TaskStatus].some((task) => task.id === activeId),
    ) as TaskStatus;

    const isFromArchive = archivedTasks.some((task) => task.id === activeId);
    if (!sourceColumn && !isFromArchive) return;

    const isOverColumn = Object.keys(boardData).includes(overId);
    const destinationColumn = (isOverColumn
      ? overId
      : Object.keys(boardData).find((status) =>
          boardData[status as TaskStatus].some((task) => task.id === overId),
        )) as TaskStatus;

    if (isFromArchive) {
      if (!destinationColumn) return;

      try {
        await taskService.updateTaskActive(activeId);
        await taskService.updateTaskStatus(activeId, destinationColumn);
        toast({
          title: "Task restored",
          description: `Task moved to ${destinationColumn.replace("_", " ")}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        await fetchTasks();
      } catch (error) {
        toast({
          title: "Error restoring task",
          description: error instanceof Error ? error.message : "An error occurred",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
      return;
    }

    if (!destinationColumn) return;

    if (sourceColumn === destinationColumn) {
      if (!isOverColumn) {
        const oldIndex = boardData[sourceColumn].findIndex((task) => task.id === activeId);
        const newIndex = boardData[sourceColumn].findIndex((task) => task.id === overId);

        if (oldIndex !== newIndex) {
          const newItems = arrayMove(boardData[sourceColumn], oldIndex, newIndex);
          setBoardData((prev) => ({ ...prev, [sourceColumn]: newItems }));
          try {
            await updateTaskOrders(newItems);
          } catch (error) {
            console.error("Failed to update task order:", error);
            void fetchTasks();
          }
        }
      }
      return;
    }

    const taskToMove = boardData[sourceColumn].find((task) => task.id === activeId);
    if (!taskToMove) return;

    let updatedDestinationItems: TaskType[] = [];
    setBoardData((prev) => {
      const newSourceItems = prev[sourceColumn].filter((task) => task.id !== activeId);
      updatedDestinationItems = [...prev[destinationColumn]];
      if (!isOverColumn) {
        const overIndex = prev[destinationColumn].findIndex((task) => task.id === overId);
        updatedDestinationItems.splice(overIndex, 0, { ...taskToMove, status: destinationColumn });
      } else {
        updatedDestinationItems.push({ ...taskToMove, status: destinationColumn });
      }

      return {
        ...prev,
        [sourceColumn]: newSourceItems,
        [destinationColumn]: updatedDestinationItems,
      };
    });

    try {
      await taskService.updateTaskStatus(activeId, destinationColumn);
      await updateTaskOrders(updatedDestinationItems);
      if (destinationColumn === TaskStatus.DONE) {
        setSuccessAnimation({ show: true, title: taskToMove.title || "Task" });
      }
      toast({
        title: "Task updated",
        description: `Task moved to ${destinationColumn.replace("_", " ")}`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error updating task",
        description: error instanceof Error ? error.message : "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleAddTask = (status: TaskStatus) => {
    if (employeeInteractionOnly) {
      return;
    }
    setCurrentTask({
      status,
      priority: TaskPriority.MEDIUM,
      assignedTo: "",
      createdBy: "",
      decisionStatus: TaskDecisionStatus.PENDING,
    });
    onOpen();
  };

  const handleEditTask = (task: TaskType) => {
    if (employeeInteractionOnly && onEmployeeTaskSelect) {
      onEmployeeTaskSelect(task);
      return;
    }
    setCurrentTask(task);
    onOpen();
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await taskService.deleteTask(id);
      toast({ title: "Task deleted", status: "success", duration: 3000, isClosable: true });
      await fetchTasks();
    } catch (error) {
      toast({
        title: "Error deleting task",
        description: error instanceof Error ? error.message : "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleArchiveTask = async (id: string) => {
    try {
      await taskService.updateTaskActive(id);
      toast({ title: "Task archived", status: "success", duration: 3000, isClosable: true });
      await fetchTasks();
    } catch (error) {
      toast({
        title: "Error archiving task",
        description: error instanceof Error ? error.message : "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSaveTask = async () => {
    if (!currentTask?.title) {
      toast({ title: "Title is required", status: "error", duration: 3000, isClosable: true });
      return;
    }

    try {
      const updatePayload: UpdateTaskDto = {
        title: currentTask.title,
        description: currentTask.description,
        priority: currentTask.priority as TaskPriority,
        dueDate: currentTask.dueDate ? new Date(currentTask.dueDate) : undefined,
        rationale: currentTask.rationale,
        decisionStatus: currentTask.decisionStatus as TaskDecisionStatus,
        blockerNote: currentTask.blockerNote,
        employeeComment: currentTask.employeeComment,
        estimatedHours: currentTask.estimatedHours,
      };

      if (userRole === UserRole.ADMIN) {
        updatePayload.assignedTo = currentTask.assignedTo;
      } else {
        updatePayload.assignedTo = currentUserId;
      }

      if (currentTask.id) {
        await taskService.updateTask(currentTask.id, updatePayload);
        toast({ title: "Task updated", status: "success", duration: 3000, isClosable: true });
      } else {
        await taskService.createTask({
          title: currentTask.title,
          description: currentTask.description,
          status: currentTask.status || TaskStatus.TODO,
          priority: currentTask.priority as TaskPriority,
          assignedTo: userRole === UserRole.ADMIN ? currentTask.assignedTo || "" : currentUserId,
          order: boardData[currentTask.status || TaskStatus.TODO].length,
          dueDate: currentTask.dueDate ? new Date(currentTask.dueDate) : undefined,
          rationale: currentTask.rationale,
          decisionStatus: (currentTask.decisionStatus as TaskDecisionStatus) || TaskDecisionStatus.PENDING,
          blockerNote: currentTask.blockerNote,
          employeeComment: currentTask.employeeComment,
          estimatedHours: currentTask.estimatedHours,
        });
        toast({ title: "Task created", status: "success", duration: 3000, isClosable: true });
      }
      await fetchTasks();
      onClose();
      setCurrentTask(null);
    } catch (error) {
      toast({
        title: "Error saving task",
        description: error instanceof Error ? error.message : "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleQuickReminder = async () => {
    if (!currentTask?.id) {
      toast({
        title: "Save the task first",
        description: "Reminders can only be scheduled for existing tasks.",
        status: "warning",
        duration: 3500,
        isClosable: true,
      });
      return;
    }

    try {
      const remindAt = new Date(Date.now() + 60_000);
      await taskService.createTaskReminder(currentTask.id, remindAt);
      toast({
        title: "Reminder scheduled",
        description: "You'll get a notification in about 1 minute.",
        status: "success",
        duration: 3500,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Failed to schedule reminder",
        description: error instanceof Error ? error.message : "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return <Box p={4}>Loading tasks...</Box>;
  }

  return (
    <Box p={4}>
      <TaskSuccessAnimation
        show={successAnimation.show}
        taskTitle={successAnimation.title}
        onComplete={() => setSuccessAnimation({ show: false, title: "" })}
      />

      <Heading color="var(--font-color)" size="lg" mb={6} textAlign="center">
        Task Board
      </Heading>
      {showControls && currentUserId && (
        <HStack justify="center" mb={4} spacing={3}>
          <Button size="sm" colorScheme={currentStatus === "PAUSE" ? "orange" : "green"} onClick={togglePause}>
            {currentStatus === "PAUSE" ? "Resume" : "Pause"}
          </Button>
          <IconButton aria-label="Refresh" icon={<RepeatIcon />} size="sm" colorScheme="blue" onClick={fetchTasks} />
        </HStack>
      )}
      {userRole !== UserRole.ADMIN && (
        <HStack justify="center" mb={4}>
          <Badge colorScheme="blue">Your Tasks</Badge>
          <Text fontSize="sm" color="gray.600">
            You can only see and work on your assigned tasks
          </Text>
        </HStack>
      )}

      <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Flex direction={{ base: "column", md: "row" }} align={{ base: "center", md: "flex-start" }} overflowX="auto" pb={4}>
          {statusOrder.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={boardData[status]}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              canAddTask={!employeeInteractionOnly}
            />
          ))}
        </Flex>
        <Flex direction="row" justify="space-around" mt={6}>
          <Box>
            <ArchiveZone onArchive={handleArchiveTask} />
            <Flex justify="center" mt={2}>
              <IconButton
                aria-label={showArchivedTasks ? "Hide archived tasks" : "Show archived tasks"}
                icon={showArchivedTasks ? <ViewOffIcon /> : <ViewIcon />}
                onClick={() => setShowArchivedTasks((prev) => !prev)}
                variant="outline"
                colorScheme="orange"
                size="sm"
              />
            </Flex>
            {showArchivedTasks && (
              <Box mt={3} p={3} maxH="260px" overflowY="auto" border="1px dashed" borderColor="orange.300" borderRadius="md" bg="var(--dark-color)">
                <Text color="var(--font-color)" fontSize="sm" mb={2}>
                  Archived tasks ({archivedTasks.length}) - drag one into a column to restore
                </Text>
                <SortableContext items={archivedTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                  {archivedTasks.map((task) => (
                    <Task key={task.id} task={task} onEdit={handleEditTask} onDelete={handleDeleteTask} />
                  ))}
                </SortableContext>
                {archivedTasks.length === 0 && (
                  <Text color="var(--font-color)" fontSize="sm" opacity={0.8}>
                    No archived tasks yet
                  </Text>
                )}
              </Box>
            )}
          </Box>
          <DeleteZone onDelete={handleDeleteTask} />
        </Flex>
      </DndContext>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{currentTask?.id ? "Edit Task" : "Create Task"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {employeeInteractionOnly ? (
                <>
                  <Box w="100%">
                    <Text fontWeight="700">{currentTask?.title}</Text>
                    <Text color="gray.500" mt={2}>
                      {currentTask?.description || "No extra task description yet."}
                    </Text>
                    {currentTask?.rationale && (
                      <Text color="teal.600" fontSize="sm" mt={3}>
                        Why this task: {currentTask.rationale}
                      </Text>
                    )}
                  </Box>
                  <Textarea
                    placeholder="Add a comment"
                    value={currentTask?.employeeComment || ""}
                    onChange={(e) => setCurrentTask((prev) => ({ ...prev, employeeComment: e.target.value }))}
                  />
                  <HStack w="100%" justify="space-between">
                    <Button
                      colorScheme="teal"
                      variant={currentTask?.decisionStatus === TaskDecisionStatus.ACCEPTED ? "solid" : "outline"}
                      onClick={() => setCurrentTask((prev) => ({ ...prev, decisionStatus: TaskDecisionStatus.ACCEPTED }))}
                    >
                      Accept
                    </Button>
                    <Button
                      colorScheme="red"
                      variant={currentTask?.decisionStatus === TaskDecisionStatus.DECLINED ? "solid" : "outline"}
                      onClick={() => setCurrentTask((prev) => ({ ...prev, decisionStatus: TaskDecisionStatus.DECLINED }))}
                    >
                      Decline
                    </Button>
                  </HStack>
                </>
              ) : (
                <>
                  <Input
                    placeholder="Task title"
                    value={currentTask?.title || ""}
                    onChange={(e) => setCurrentTask((prev) => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={currentTask?.description || ""}
                    onChange={(e) => setCurrentTask((prev) => ({ ...prev, description: e.target.value }))}
                  />
                  <Select
                    value={currentTask?.priority || TaskPriority.MEDIUM}
                    onChange={(e) => setCurrentTask((prev) => ({ ...prev, priority: e.target.value as TaskPriority }))}
                  >
                    {Object.values(TaskPriority).map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </Select>
                  {userRole === UserRole.ADMIN && (
                    <Select
                      placeholder="Assign teammate"
                      value={currentTask?.assignedTo || ""}
                      onChange={(e) => setCurrentTask((prev) => ({ ...prev, assignedTo: e.target.value }))}
                    >
                      {assignableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} - {user.presenceStatus === "PAUSE" ? "Paused" : user.presenceStatus === "ONLINE" ? "Available" : "Offline"}
                        </option>
                      ))}
                    </Select>
                  )}
                  <Textarea
                    placeholder="Why this task matters"
                    value={currentTask?.rationale || ""}
                    onChange={(e) => setCurrentTask((prev) => ({ ...prev, rationale: e.target.value }))}
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Estimated hours"
                    value={currentTask?.estimatedHours ?? ""}
                    onChange={(e) => setCurrentTask((prev) => ({ ...prev, estimatedHours: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                  <Select
                    value={currentTask?.decisionStatus || TaskDecisionStatus.PENDING}
                    onChange={(e) => setCurrentTask((prev) => ({ ...prev, decisionStatus: e.target.value as TaskDecisionStatus }))}
                  >
                    {Object.values(TaskDecisionStatus).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                  <Textarea
                    placeholder="Blocker note (optional)"
                    value={currentTask?.blockerNote || ""}
                    onChange={(e) => setCurrentTask((prev) => ({ ...prev, blockerNote: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Comment / update"
                    value={currentTask?.employeeComment || ""}
                    onChange={(e) => setCurrentTask((prev) => ({ ...prev, employeeComment: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={currentTask?.dueDate ? new Date(currentTask.dueDate).toISOString().split("T")[0] : ""}
                    onChange={(e) =>
                      setCurrentTask((prev) => ({
                        ...prev,
                        dueDate: e.target.value ? new Date(e.target.value) : undefined,
                      }))
                    }
                    placeholder="Due Date"
                    width="100%"
                  />
                  <Button variant="outline" size="sm" onClick={handleQuickReminder}>
                    Remind me in 1 minute
                  </Button>
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme={employeeInteractionOnly ? "teal" : "blue"} onClick={handleSaveTask}>
              {employeeInteractionOnly ? "Save response" : "Save"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Board;
