import OpenAI from 'openai';
import type { DebateMessage, Level, Persona } from '../types';

const LEVEL_INSTRUCTIONS: Record<Level, string> = {
  elementary:
    'elementary school level (grades K–5): use simple everyday words, fun comparisons, and avoid jargon',
  middle:
    'middle school level (grades 6–8): use some technical terms but explain them briefly, keep it relatable',
  high: 'high school level (grades 9–12): use proper scientific vocabulary and explain concepts clearly',
  college:
    'college / advanced level: use academic language, nuanced arguments, and theoretical frameworks freely',
};

export function createClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

export async function generatePersonas(
  client: OpenAI,
  topic: string,
  _level: Level,
): Promise<[Persona, Persona]> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Create two vivid, opposing debate personas for the topic: "${topic}"

Return ONLY valid JSON — no explanation, no markdown fences:
{
  "personaA": {
    "name": "Memorable 2–3-word character name that embodies their stance",
    "emoji": "one emoji",
    "stance": "Their position in one bold, specific sentence",
    "personality": "One adjective that defines HOW they argue (e.g. fiery, methodical, sardonic, earnest)"
  },
  "personaB": {
    "name": "Memorable 2–3-word character name for the opposing side",
    "emoji": "one emoji",
    "stance": "Their OPPOSING position in one bold, specific sentence",
    "personality": "One adjective — different from A's"
  }
}

Make the names evocative and topic-specific. Example: "Professor Wavelength" vs "Dr. Quanta" for a light debate.`,
      },
    ],
  });

  const raw = response.choices[0].message.content ?? '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse personas. Please try again.');

  const data = JSON.parse(match[0]) as {
    personaA: Omit<Persona, 'id'>;
    personaB: Omit<Persona, 'id'>;
  };

  return [
    { id: 'a', ...data.personaA },
    { id: 'b', ...data.personaB },
  ];
}

export async function generateArgument(
  client: OpenAI,
  params: {
    speakingPersona: Persona;
    otherPersona: Persona;
    round: number;
    totalRounds: number;
    previousMessages: DebateMessage[];
    topic: string;
    level: Level;
  },
  onChunk: (text: string) => void,
): Promise<string> {
  const { speakingPersona, otherPersona, round, totalRounds, previousMessages, topic, level } =
    params;

  // Find the opponent's most recent message (if any) for direct referencing
  const lastOpponentMsg = [...previousMessages]
    .reverse()
    .find((m) => m.personaId === otherPersona.id);

  // Build transcript for context
  const transcript = previousMessages
    .map((m) => {
      const name = m.personaId === speakingPersona.id ? speakingPersona.name : otherPersona.name;
      return `${name}: ${m.text}`;
    })
    .join('\n\n');

  // ── Craft user prompt based on round ──
  let userPrompt: string;

  if (round === 1) {
    userPrompt =
      `Open the debate on: "${topic}"\n\n` +
      `Deliver a powerful opening statement. Start with a hook — a bold claim, a surprising fact, or a vivid analogy. ` +
      `State your position clearly and compellingly. Make the audience want to hear more from you.`;
  } else if (round < totalRounds) {
    userPrompt =
      `Here is the debate so far:\n\n${transcript}\n\n` +
      `${otherPersona.name} just argued:\n"${lastOpponentMsg?.text ?? ''}"\n\n` +
      `Now deliver your rebuttal. You MUST open by directly engaging with what ${otherPersona.name} said — ` +
      `name their argument, then dismantle it. Show why they're wrong or oversimplifying. ` +
      `Then reinforce your own strongest point with a concrete example or analogy. ` +
      `Be direct, sharp, and true to your personality.`;
  } else {
    // Final round
    userPrompt =
      `Here is the full debate:\n\n${transcript}\n\n` +
      `This is your closing argument — make it count. ` +
      `Briefly acknowledge the one strongest thing ${otherPersona.name} said (be fair but brief), ` +
      `then deliver the most powerful, memorable version of your case. ` +
      `End with a single line that sticks in the audience's mind.`;
  }

  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 400,
    stream: true,
    temperature: 0.85,
    messages: [
      {
        role: 'system',
        content:
          `You are ${speakingPersona.name} ${speakingPersona.emoji}, competing in a live educational debate.\n` +
          `Your position: ${speakingPersona.stance}\n` +
          `Your debate personality: ${speakingPersona.personality} — this is HOW you speak and argue. Let it come through.\n\n` +
          `RULES:\n` +
          `- Speak in first person, naturally, like a real human debater\n` +
          `- 3–5 sentences maximum — be punchy, not exhaustive\n` +
          `- Use phrases like "My opponent claims...", "But consider this...", "The real question is..."\n` +
          `- No bullet points, headers, or formal essay structure\n` +
          `- Show genuine engagement: push back hard, use analogies, bring real energy\n` +
          `- Speak at ${LEVEL_INSTRUCTIONS[level]}`,
      },
      { role: 'user', content: userPrompt },
    ],
  });

  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) {
      full += text;
      onChunk(text);
    }
  }

  return full;
}

export async function generateVerdict(
  client: OpenAI,
  params: {
    topic: string;
    level: Level;
    personaA: Persona;
    personaB: Persona;
    messages: DebateMessage[];
    winner: 'a' | 'b';
  },
  onChunk: (text: string) => void,
): Promise<string> {
  const { topic, level, personaA, personaB, messages, winner } = params;
  const winnerPersona = winner === 'a' ? personaA : personaB;

  const transcript = messages
    .map((m) => {
      const name = m.personaId === 'a' ? personaA.name : personaB.name;
      return `[Round ${m.round}] ${name}: ${m.text}`;
    })
    .join('\n\n');

  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 800,
    stream: true,
    messages: [
      {
        role: 'user',
        content:
          `You are an enthusiastic and encouraging teacher. A student watched a debate on "${topic}" ` +
          `and voted for ${winnerPersona.name} ${winnerPersona.emoji} as the winner.\n\n` +
          `DEBATE TRANSCRIPT:\n${transcript}\n\n` +
          `Write an educational verdict at ${LEVEL_INSTRUCTIONS[level]}.\n\n` +
          `Use these exact emoji section headers:\n\n` +
          `✅ **What ${personaA.name} got right:**\n[2–3 sentences]\n\n` +
          `❌ **Where ${personaA.name} oversimplified or got it wrong:**\n[2–3 sentences]\n\n` +
          `✅ **What ${personaB.name} got right:**\n[2–3 sentences]\n\n` +
          `❌ **Where ${personaB.name} oversimplified or got it wrong:**\n[2–3 sentences]\n\n` +
          `🔬 **The real story:**\n[3–4 sentences on the actual accepted understanding]\n\n` +
          `💡 **Your key takeaway:**\n[2 sentences addressed directly to the student, affirming their thinking]\n\n` +
          `Keep the tone warm, encouraging, and intellectually engaging.`,
      },
    ],
  });

  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) {
      full += text;
      onChunk(text);
    }
  }

  return full;
}
