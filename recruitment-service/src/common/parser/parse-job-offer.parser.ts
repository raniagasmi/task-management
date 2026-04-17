const SENIORITY_LEVELS = ['intern', 'junior', 'mid', 'senior'] as const;

export type SeniorityLevel = (typeof SENIORITY_LEVELS)[number];

export interface JobOffer {
  title: string;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  niceToHave: string[];
  seniorityLevel: SeniorityLevel;
}

function extractJsonCandidate(aiResponse: string): string {
  const trimmed = aiResponse.trim();

  if (!trimmed) {
    throw new Error('AI response is empty. Expected a JSON object.');
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Field "${field}" must be a non-empty string.`);
  }

  return value.trim();
}

function assertStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Field "${field}" must be an array of strings.`);
  }

  const invalidItem = value.find((item) => typeof item !== 'string' || item.trim().length === 0);
  if (invalidItem !== undefined) {
    throw new Error(`Field "${field}" must contain only non-empty strings.`);
  }

  return value.map((item) => (item as string).trim());
}

function assertSeniorityLevel(value: unknown): SeniorityLevel {
  if (typeof value !== 'string' || !SENIORITY_LEVELS.includes(value as SeniorityLevel)) {
    throw new Error(
      'Field "seniorityLevel" must be one of: intern, junior, mid, senior.',
    );
  }

  return value as SeniorityLevel;
}

export function parseJobOfferResponse(aiResponse: string): JobOffer {
  const jsonCandidate = extractJsonCandidate(aiResponse);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown JSON parsing error.';
    const preview = aiResponse.trim().slice(0, 220);
    throw new Error(
      `Failed to parse AI response as JSON. ${reason} Response preview: "${preview}"`,
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI response JSON must be an object matching the JobOffer structure.');
  }

  const record = parsed as Record<string, unknown>;
  const requiredFields = [
    'title',
    'description',
    'responsibilities',
    'requiredSkills',
    'niceToHave',
    'seniorityLevel',
  ];

  for (const field of requiredFields) {
    if (!(field in record)) {
      throw new Error(`Missing required field "${field}" in AI response JSON.`);
    }
  }

  return {
    title: assertString(record.title, 'title'),
    description: assertString(record.description, 'description'),
    responsibilities: assertStringArray(record.responsibilities, 'responsibilities'),
    requiredSkills: assertStringArray(record.requiredSkills, 'requiredSkills'),
    niceToHave: assertStringArray(record.niceToHave, 'niceToHave'),
    seniorityLevel: assertSeniorityLevel(record.seniorityLevel),
  };
}
