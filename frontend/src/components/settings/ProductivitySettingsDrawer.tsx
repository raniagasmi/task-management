import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Stack,
  Switch,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { SettingsIcon } from '@chakra-ui/icons';
import { workspacePreferencesService, WorkspacePreferences } from '../../services/workspace-preferences.service';

export const ProductivitySettingsDrawer = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [preferences, setPreferences] = useState<WorkspacePreferences>(workspacePreferencesService.getPreferences());
  const [newReply, setNewReply] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPreferences(workspacePreferencesService.getPreferences());
    }
  }, [isOpen]);

  const persist = (next: WorkspacePreferences) => {
    setPreferences(next);
    workspacePreferencesService.savePreferences(next);
  };

  return (
    <>
      <IconButton
        aria-label="Open productivity settings"
        icon={<SettingsIcon />}
        variant="outline"
        colorScheme="teal"
        size="sm"
        onClick={onOpen}
      />
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="sm">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Productivity settings</DrawerHeader>
          <DrawerBody>
            <Stack spacing={6}>
              <Box>
                <Text fontWeight="700" mb={3}>Notifications</Text>
                <Stack spacing={3}>
                  {Object.entries(preferences.notifications.channels).map(([channel, enabled]) => (
                    <FormControl key={channel} display="flex" alignItems="center" justifyContent="space-between">
                      <FormLabel mb={0} textTransform="capitalize">
                        {channel}
                      </FormLabel>
                      <Switch
                        isChecked={enabled}
                        onChange={(event) =>
                          persist({
                            ...preferences,
                            notifications: {
                              ...preferences.notifications,
                              channels: {
                                ...preferences.notifications.channels,
                                [channel]: event.target.checked,
                              },
                            },
                          })
                        }
                      />
                    </FormControl>
                  ))}
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel mb={0}>Quiet hours</FormLabel>
                    <Switch
                      isChecked={preferences.notifications.quietHoursEnabled}
                      onChange={(event) =>
                        persist({
                          ...preferences,
                          notifications: {
                            ...preferences.notifications,
                            quietHoursEnabled: event.target.checked,
                          },
                        })
                      }
                    />
                  </FormControl>
                  <HStack>
                    <Input
                      type="time"
                      value={preferences.notifications.quietHoursStart}
                      onChange={(event) =>
                        persist({
                          ...preferences,
                          notifications: {
                            ...preferences.notifications,
                            quietHoursStart: event.target.value,
                          },
                        })
                      }
                    />
                    <Input
                      type="time"
                      value={preferences.notifications.quietHoursEnd}
                      onChange={(event) =>
                        persist({
                          ...preferences,
                          notifications: {
                            ...preferences.notifications,
                            quietHoursEnd: event.target.value,
                          },
                        })
                      }
                    />
                  </HStack>
                </Stack>
              </Box>

              <Box>
                <Text fontWeight="700" mb={3}>Saved replies</Text>
                <Stack spacing={3}>
                  <HStack>
                    <Input
                      placeholder="Add a saved reply"
                      value={newReply}
                      onChange={(event) => setNewReply(event.target.value)}
                    />
                    <Button
                      colorScheme="teal"
                      onClick={() => {
                        const value = newReply.trim();
                        if (!value) {
                          return;
                        }
                        persist({
                          ...preferences,
                          collaboration: {
                            ...preferences.collaboration,
                            savedReplies: Array.from(new Set([...preferences.collaboration.savedReplies, value])),
                          },
                        });
                        setNewReply('');
                      }}
                    >
                      Save
                    </Button>
                  </HStack>
                  <Stack align="start">
                    {preferences.collaboration.savedReplies.map((reply) => (
                      <Tag key={reply} size="lg" borderRadius="full" variant="subtle" colorScheme="teal">
                        <TagLabel>{reply}</TagLabel>
                        <TagCloseButton
                          onClick={() =>
                            persist({
                              ...preferences,
                              collaboration: {
                                ...preferences.collaboration,
                                savedReplies: preferences.collaboration.savedReplies.filter((item) => item !== reply),
                              },
                            })
                          }
                        />
                      </Tag>
                    ))}
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};
