export type Level = 'elementary' | 'middle' | 'high' | 'college';

export const LEVEL_LABELS: Record<Level, string> = {
  elementary: 'Elementary (K–5)',
  middle: 'Middle School (6–8)',
  high: 'High School (9–12)',
  college: 'College / Advanced',
};

export const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  elementary: 'Simple words, fun analogies, no jargon',
  middle: 'Some terms explained, relatable examples',
  high: 'Proper vocabulary, scientific concepts',
  college: 'Academic language, nuanced theory',
};

export interface Persona {
  id: 'a' | 'b';
  name: string;
  emoji: string;
  stance: string;
  personality: string;
}

export interface DebateMessage {
  id: string;
  personaId: 'a' | 'b';
  text: string;
  round: number;
  isComplete: boolean;
}

export type AppPhase =
  | 'setup'
  | 'generating-personas'
  | 'debating'
  | 'debate-complete'
  | 'judging'
  | 'generating-verdict'
  | 'verdict';

export const TOTAL_ROUNDS = 3;

export const SUGGESTED_TOPICS = [
  'Is light a wave or a particle?',
  'Was the internet good or bad for society?',
  'Should humans colonize Mars?',
  'Is mathematics discovered or invented?',
  'Are AI systems truly intelligent?',
  'Was the Industrial Revolution a net positive?',
];
