import { useState, useRef, useCallback } from 'react';
import type OpenAI from 'openai';
import type { AppPhase, DebateMessage, Level, Persona } from './types';
import { TOTAL_ROUNDS } from './types';
import { createClient, generatePersonas, generateArgument, generateVerdict } from './lib/openai';
import SetupScreen from './components/SetupScreen';
import DebateArena from './components/DebateArena';
import JudgingScreen from './components/JudgingScreen';
import VerdictScreen from './components/VerdictScreen';

// Typewriter speed: characters revealed per tick
const CHARS_PER_TICK = 3;
const TICK_MS = 18;

// Pause between the two speakers within a round (ms)
const BETWEEN_SPEAKERS_MS = 2000;

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}`;
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('setup');
  const [error, setError] = useState<string | null>(null);

  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<Level>('high');

  const [personaA, setPersonaA] = useState<Persona | null>(null);
  const [personaB, setPersonaB] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [streamingPersonaId, setStreamingPersonaId] = useState<'a' | 'b' | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [statusText, setStatusText] = useState('');

  // Round gate: set true after both speakers finish a round (except the last)
  const [waitingForNextRound, setWaitingForNextRound] = useState(false);
  const [completedRound, setCompletedRound] = useState(0);
  const nextRoundResolveRef = useRef<(() => void) | null>(null);

  // Vote gate: set true after Round 3 ends; user must confirm before voting
  const [waitingForVote, setWaitingForVote] = useState(false);
  const voteResolveRef = useRef<(() => void) | null>(null);

  const [winner, setWinner] = useState<'a' | 'b' | null>(null);
  const [verdictText, setVerdictText] = useState('');
  const [isVerdictStreaming, setIsVerdictStreaming] = useState(false);

  const clientRef = useRef<OpenAI | null>(null);

  // ── Typewriter queue ──────────────────────────────
  const rawQueueRef = useRef('');
  const displayedRef = useRef('');
  const apiDoneRef = useRef(false);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getClient = useCallback(() => {
    if (!clientRef.current) {
      const key = import.meta.env.VITE_OPENAI_API_KEY as string;
      clientRef.current = createClient(key);
    }
    return clientRef.current;
  }, []);

  const appendMessage = useCallback(
    (personaId: 'a' | 'b', text: string, round: number): DebateMessage => {
      const msg: DebateMessage = { id: nextId(), personaId, text, round, isComplete: true };
      setMessages((prev) => [...prev, msg]);
      return msg;
    },
    [],
  );

  const startTypewriter = useCallback((): Promise<void> => {
    rawQueueRef.current = '';
    displayedRef.current = '';
    apiDoneRef.current = false;

    return new Promise((resolve) => {
      tickerRef.current = setInterval(() => {
        if (rawQueueRef.current.length > 0) {
          const take = rawQueueRef.current.slice(0, CHARS_PER_TICK);
          rawQueueRef.current = rawQueueRef.current.slice(CHARS_PER_TICK);
          displayedRef.current += take;
          setStreamingText(displayedRef.current);
        } else if (apiDoneRef.current) {
          clearInterval(tickerRef.current!);
          tickerRef.current = null;
          resolve();
        }
      }, TICK_MS);
    });
  }, []);

  const stopTypewriter = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  // ── Main debate loop ──────────────────────────────
  const handleStart = useCallback(
    async (chosenTopic: string, chosenLevel: Level) => {
      setError(null);
      setTopic(chosenTopic);
      setLevel(chosenLevel);
      setMessages([]);
      setStreamingText('');
      setStreamingPersonaId(null);
      setCurrentRound(1);
      setWinner(null);
      setVerdictText('');
      setWaitingForNextRound(false);
      setCompletedRound(0);
      setPhase('generating-personas');

      try {
        const client = getClient();
        const [pA, pB] = await generatePersonas(client, chosenTopic, chosenLevel);
        setPersonaA(pA);
        setPersonaB(pB);

        setPhase('debating');
        const debateMessages: DebateMessage[] = [];

        for (let round = 1; round <= TOTAL_ROUNDS; round++) {
          setCurrentRound(round);

          for (const pid of ['a', 'b'] as const) {
            const speakingPersona = pid === 'a' ? pA : pB;
            const otherPersona = pid === 'a' ? pB : pA;

            const roundLabel =
              round === 1
                ? 'opening statement'
                : round === TOTAL_ROUNDS
                ? 'closing argument'
                : 'rebuttal';

            setStatusText(`${speakingPersona.emoji} ${speakingPersona.name} is thinking…`);
            setStreamingPersonaId(pid);
            setStreamingText('');

            const typewriterDone = startTypewriter();

            const fullText = await generateArgument(
              client,
              {
                speakingPersona,
                otherPersona,
                round,
                totalRounds: TOTAL_ROUNDS,
                previousMessages: debateMessages,
                topic: chosenTopic,
                level: chosenLevel,
              },
              (chunk) => {
                rawQueueRef.current += chunk;
              },
            );

            apiDoneRef.current = true;
            setStatusText(`📖 ${speakingPersona.name} has spoken — take it in…`);
            await typewriterDone;

            setStreamingPersonaId(null);
            setStreamingText('');

            const msg = appendMessage(pid, fullText, round);
            debateMessages.push(msg);

            // Pause between the two speakers within a round
            const isLastSpeakerInRound = pid === 'b';
            if (!isLastSpeakerInRound) {
              setStatusText(`⏸ Next up: ${otherPersona.emoji} ${otherPersona.name}…`);
              await new Promise((r) => setTimeout(r, BETWEEN_SPEAKERS_MS));
            }

            void roundLabel;
          }

          // After both speakers finish this round, gate on user input
          // (skip the gate after the final round — go to debate-complete instead)
          if (round < TOTAL_ROUNDS) {
            setCompletedRound(round);
            setWaitingForNextRound(true);
            setStatusText('');

            // Wait for user to click "Continue to Round X"
            await new Promise<void>((resolve) => {
              nextRoundResolveRef.current = resolve;
            });

            setWaitingForNextRound(false);
          }
        }

        // After Round 3: show the vote-prompt gate inside the arena
        setStatusText('');
        setWaitingForVote(true);
        await new Promise<void>((resolve) => {
          voteResolveRef.current = resolve;
        });
        setWaitingForVote(false);
        setPhase('judging');
      } catch (err) {
        stopTypewriter();
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Something went wrong: ${msg}`);
        setPhase('setup');
      }
    },
    [getClient, appendMessage, startTypewriter, stopTypewriter],
  );

  // Called when user clicks "Continue to Round X"
  const handleNextRound = useCallback(() => {
    nextRoundResolveRef.current?.();
    nextRoundResolveRef.current = null;
  }, []);

  const handleReadyToVote = useCallback(() => {
    voteResolveRef.current?.();
    voteResolveRef.current = null;
  }, []);

  // ── Voting ────────────────────────────────────────
  const handleVote = useCallback(
    async (chosenWinner: 'a' | 'b') => {
      if (!personaA || !personaB) return;
      setWinner(chosenWinner);
      setVerdictText('');
      setIsVerdictStreaming(true);
      setPhase('generating-verdict');

      try {
        const client = getClient();
        let accumulated = '';
        await generateVerdict(
          client,
          { topic, level, personaA, personaB, messages, winner: chosenWinner },
          (chunk) => {
            accumulated += chunk;
            setVerdictText(accumulated);
          },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setVerdictText(`Error generating verdict: ${msg}`);
      } finally {
        setIsVerdictStreaming(false);
        setPhase('verdict');
      }
    },
    [personaA, personaB, getClient, topic, level, messages],
  );

  // ── Reset ─────────────────────────────────────────
  const handleReset = useCallback(() => {
    stopTypewriter();
    // Resolve any pending round gate so the async loop can exit cleanly
    nextRoundResolveRef.current?.();
    nextRoundResolveRef.current = null;
    voteResolveRef.current?.();
    voteResolveRef.current = null;
    setPhase('setup');
    setError(null);
    setTopic('');
    setPersonaA(null);
    setPersonaB(null);
    setMessages([]);
    setWinner(null);
    setVerdictText('');
    setWaitingForNextRound(false);
    setWaitingForVote(false);
    setCompletedRound(0);
    msgCounter = 0;
  }, [stopTypewriter]);

  // ── Render ────────────────────────────────────────

  if (phase === 'setup') {
    return <SetupScreen onStart={handleStart} error={error} isLoading={false} />;
  }

  if (phase === 'generating-personas') {
    return (
      <div className="screen generating-screen">
        <div className="spinner" />
        <h2>Preparing the debaters…</h2>
        <p>Creating two expert personas for your topic.</p>
      </div>
    );
  }

  if (phase === 'debating' && personaA && personaB) {
    return (
      <DebateArena
        personaA={personaA}
        personaB={personaB}
        messages={messages}
        streamingPersonaId={streamingPersonaId}
        streamingText={streamingText}
        currentRound={currentRound}
        statusText={statusText}
        waitingForNextRound={waitingForNextRound}
        completedRound={completedRound}
        onNextRound={handleNextRound}
        waitingForVote={waitingForVote}
        onReadyToVote={handleReadyToVote}
      />
    );
  }

  if (phase === 'judging' && personaA && personaB) {
    return <JudgingScreen personaA={personaA} personaB={personaB} onVote={handleVote} />;
  }

  if ((phase === 'generating-verdict' || phase === 'verdict') && personaA && personaB && winner) {
    return (
      <VerdictScreen
        personaA={personaA}
        personaB={personaB}
        winner={winner}
        verdictText={verdictText}
        isStreaming={isVerdictStreaming}
        onReset={handleReset}
      />
    );
  }

  return <SetupScreen onStart={handleStart} error={error} isLoading={false} />;
}
