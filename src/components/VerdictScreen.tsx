import type { Persona } from '../types';

interface Props {
  personaA: Persona;
  personaB: Persona;
  winner: 'a' | 'b';
  verdictText: string;
  isStreaming: boolean;
  onReset: () => void;
}

export default function VerdictScreen({
  personaA,
  personaB,
  winner,
  verdictText,
  isStreaming,
  onReset,
}: Props) {
  const winnerPersona = winner === 'a' ? personaA : personaB;

  return (
    <div className="screen verdict-screen">
      <div className="verdict-header">
        <div className="verdict-winner-badge">
          🏆 Your vote: {winnerPersona.emoji} {winnerPersona.name}
        </div>
        <h2>Here's what the teacher thinks…</h2>
        <p>Let's unpack who got what right — and what the real answer is.</p>
      </div>

      <div className="verdict-card">
        <div className="verdict-card-title">📚 Teacher's Verdict</div>
        <div className={`verdict-text${isStreaming ? ' verdict-streaming' : ''}`}>
          {verdictText || ' '}
          {isStreaming && <span className="cursor-line" />}
        </div>
      </div>

      {!isStreaming && verdictText && (
        <button className="btn-secondary" onClick={onReset}>
          🔄 Debate another topic
        </button>
      )}
    </div>
  );
}
