import React from 'react';
import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Progress,
  Stack,
  Text,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { getPasswordChecklist, getPasswordStrength } from './auth.utils';

interface PasswordFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  color?: string;
  bg?: string;
  borderColor?: string;
  placeholder?: string;
  error?: string;
  showStrength?: boolean;
  isRequired?: boolean;
  autoComplete?: string;
}

const PasswordField = ({
  label,
  name,
  value,
  onChange,
  color = '#D8D8DB',
  bg = 'rgba(216,216,219,0.08)',
  borderColor = 'rgba(216,216,219,0.26)',
  placeholder,
  error,
  showStrength = false,
  isRequired = false,
  autoComplete,
}: PasswordFieldProps) => {
  const [visible, setVisible] = React.useState(false);
  const strength = getPasswordStrength(value);
  const checklist = getPasswordChecklist(value);

  return (
    <FormControl isRequired={isRequired} isInvalid={!!error}>
      <FormLabel color="rgba(216,216,219,0.9)">{label}</FormLabel>
      <InputGroup>
        <Input
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          bg={bg}
          borderColor={borderColor}
          color={color}
          _placeholder={{ color: 'rgba(216,216,219,0.52)' }}
          _hover={{ borderColor: 'teal.300' }}
          _focusVisible={{ borderColor: 'teal.300', boxShadow: '0 0 0 1px #319795' }}
        />
        <InputRightElement>
          <IconButton
            aria-label={visible ? 'Hide password' : 'Show password'}
            size="sm"
            variant="ghost"
            color="rgba(216,216,219,0.75)"
            icon={visible ? <ViewOffIcon /> : <ViewIcon />}
            onClick={() => setVisible((prev) => !prev)}
          />
        </InputRightElement>
      </InputGroup>

      {showStrength && (
        <Stack spacing={2} mt={3}>
          <HStack justify="space-between">
            <Text fontSize="sm" color="rgba(216,216,219,0.76)">
              Password strength
            </Text>
            <Text fontSize="sm" color={strength.color === 'teal' ? 'teal.300' : strength.color === 'orange' ? 'orange.300' : 'red.300'}>
              {strength.label}
            </Text>
          </HStack>
          <Progress value={(strength.score / 5) * 100} size="sm" colorScheme={strength.color} borderRadius="full" />
          <HStack wrap="wrap" spacing={3} align="start">
            <Text fontSize="xs" color={checklist.minLength ? 'teal.300' : 'rgba(216,216,219,0.55)'}>8+ chars</Text>
            <Text fontSize="xs" color={checklist.uppercase ? 'teal.300' : 'rgba(216,216,219,0.55)'}>Uppercase</Text>
            <Text fontSize="xs" color={checklist.lowercase ? 'teal.300' : 'rgba(216,216,219,0.55)'}>Lowercase</Text>
            <Text fontSize="xs" color={checklist.number ? 'teal.300' : 'rgba(216,216,219,0.55)'}>Number</Text>
            <Text fontSize="xs" color={checklist.symbol ? 'teal.300' : 'rgba(216,216,219,0.55)'}>Symbol</Text>
          </HStack>
        </Stack>
      )}

      {error && <FormErrorMessage>{error}</FormErrorMessage>}
    </FormControl>
  );
};

export default PasswordField;
