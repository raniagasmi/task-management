export function buildJobOfferPrompt(userInput: string): string {
  const sanitizedInput = userInput.trim();

  return [
    'You are a professional technical recruiter and job description writer.',
    'Create one LinkedIn-ready job offer from the user request.',
    '',
    'CRITICAL OUTPUT RULES (MUST FOLLOW):',
    '1) Return STRICT JSON ONLY.',
    '2) Do not include markdown, code fences, comments, or explanations.',
    '3) Do not include any text before or after the JSON object.',
    '4) Output must be valid JSON parsable by JSON.parse.',
    '5) Use exactly this schema and no extra fields:',
    '{',
    '  "title": string,',
    '  "description": string,',
    '  "responsibilities": string[],',
    '  "requiredSkills": string[],',
    '  "niceToHave": string[],',
    '  "seniorityLevel": "intern" | "junior" | "mid" | "senior"',
    '}',
    '',
    'QUALITY RULES:',
    '- Professional, concise job offer style suitable for LinkedIn posting.',
    '- Adapt tone and wording based on the role context provided by the user.',
    '- Standardize skill naming (example: "JS" -> "JavaScript", "TS" -> "TypeScript").',
    '- Keep description concise, clear, and business-professional.',
    '- Responsibilities and skills should be specific and practical.',
    '- Use seniorityLevel strictly as one of: intern, junior, mid, senior.',
    '',
    'User request:',
    sanitizedInput || '(empty input)',
  ].join('\n');
}
