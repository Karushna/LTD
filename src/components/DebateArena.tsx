import { useEffect, useRef } from 'react';
import type { DebateMessage, Persona } from '../types';
import { TOTAL_ROUNDS } from '../types';

const ROUND_LABELS: Record<number, string> = {
  1: 'Opening Statements',
  2: 'Rebuttals',
  3: 'Closing Arguments',
};

const NEXT_ROUND_LABELS: Record<number, string> = {
  1: 'Continue to Round 2 — Rebuttals',
  2: 'Continue to Round 3 — Closing Arguments',
};

interface Props {
  personaA: Persona;
  personaB: Persona;
  messages: DebateMessage[];
  streamingPersonaId: 'a' | 'b' | null;
  streamingText: string;
  currentRound: number;
  statusText: string;
  waitingForNextRound: boolean;
  completedRound: number;
  onNextRound: () => void;
  waitingForVote: boolean;
  onReadyToVote: () => void;
}

export default function DebateArena({
  personaA,
  personaB,
  messages,
  streamingPersonaId,
  streamingText,
  currentRound,
  statusText,
  waitingForNextRound,
  completedRound,
  onNextRound,
  waitingForVote,
  onReadyToVote,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, waitingForNextRound, waitingForVote]);

  const isActiveA = streamingPersonaId === 'a';
  const isActiveB = streamingPersonaId === 'b';
  const rounds = Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1);
  const getPersona = (id: 'a' | 'b') => (id === 'a' ? personaA : personaB);

  const messageElements: React.ReactNode[] = [];
  let lastRound = 0;

  const allMessages: Array<DebateMessage | { streaming: true; personaId: 'a' | 'b'; round: number }> =
    [...messages];

  if (streamingPersonaId) {
    allMessages.push({ streaming: true, personaId: streamingPersonaId, round: currentRound });
  }

  allMessages.forEach((msg) => {
    const round = msg.round;

    if (round !== lastRound) {
      messageElements.push(
        <div key={`divider-${round}`} className="round-divider">
          Round {round} — {ROUND_LABELS[round] ?? ''}
        </div>,
      );
      lastRound = round;
    }

    const pid = msg.personaId;
    const persona = getPersona(pid);
    const isStreaming = 'streaming' in msg;
    const text = isStreaming ? streamingText : (msg as DebateMessage).text;

    messageElements.push(
      <div
        key={isStreaming ? 'streaming' : (msg as DebateMessage).id}
        className={`message-wrap from-${pid}`}
      >
        <div className="message-avatar">{persona.emoji}</div>
        <div className="message-bubble">
          <div className="message-name">{persona.name}</div>
          {text}
          {isStreaming && <span className="cursor" />}
        </div>
      </div>,
    );
  });

  return (
    <div className="arena-screen screen">
      {/* Header */}
      <div className="arena-header">
        <div className={`persona-chip${isActiveA ? ' active-a' : ' idle'}`}>
          <span className="persona-emoji">{personaA.emoji}</span>
          <div>
            <div className="persona-name">{personaA.name}</div>
            <div className="persona-stance">{personaA.stance}</div>
          </div>
        </div>

        <div className="round-badge">
          <span className="round-label">Round</span>
          <div className="round-dots">
            {rounds.map((r) => (
              <div
                key={r}
                className={`round-dot${r < currentRound ? ' done' : r === currentRound ? ' active' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className={`persona-chip persona-chip-b${isActiveB ? ' active-b' : ' idle'}`}>
          <span className="persona-emoji">{personaB.emoji}</span>
          <div>
            <div className="persona-name">{personaB.name}</div>
            <div className="persona-stance">{personaB.stance}</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-area">
        {messageElements}
        <div ref={bottomRef} />
      </div>

      {/* Bottom bar — three states: vote prompt, round gate, or live status */}
      {waitingForVote ? (
        <div className="round-gate-bar vote-gate-bar">
          <div className="vote-gate-text">
            <span className="round-gate-check">✓</span>
            <div>
              <div className="vote-gate-title">All 3 rounds are done — the debate is over!</div>
              <div className="vote-gate-sub">
                Ready to decide who argued better?
              </div>
            </div>
          </div>
          <div className="vote-gate-actions">
            <button className="btn-next-round btn-cast-vote" onClick={onReadyToVote}>
              🗳️ Cast my vote →
            </button>
          </div>
        </div>
      ) : waitingForNextRound ? (
        <div className="round-gate-bar">
          <div className="round-gate-info">
            <span className="round-gate-check">✓</span>
            <span>
              Round {completedRound} complete —{' '}
              <em>{ROUND_LABELS[completedRound] ?? ''}</em>
            </span>
          </div>
          <button className="btn-next-round" onClick={onNextRound}>
            {NEXT_ROUND_LABELS[completedRound] ?? 'Continue'} →
          </button>
        </div>
      ) : (
        <div className="status-bar">
          {statusText && (
            <>
              <div className="status-dot" />
              {statusText}
            </>
          )}
        </div>
      )}
    </div>
  );
}
