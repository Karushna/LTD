import type { Persona } from '../types';

interface Props {
  personaA: Persona;
  personaB: Persona;
  onVote: (winner: 'a' | 'b') => void;
}

export default function JudgingScreen({ personaA, personaB, onVote }: Props) {
  return (
    <div className="screen judging-screen">
      <div className="judging-title">
        <h2>Who argued better? 🧑‍⚖️</h2>
        <p>Vote for the side that made the most convincing case.</p>
      </div>

      <div className="judging-cards">
        <button className="judge-card a" onClick={() => onVote('a')}>
          <div className="judge-emoji">{personaA.emoji}</div>
          <div className="judge-name">{personaA.name}</div>
          <div className="judge-stance">{personaA.stance}</div>
          <div className="btn-vote btn-vote-a">Vote for {personaA.name}</div>
        </button>

        <div className="vs-badge">VS</div>

        <button className="judge-card b" onClick={() => onVote('b')}>
          <div className="judge-emoji">{personaB.emoji}</div>
          <div className="judge-name">{personaB.name}</div>
          <div className="judge-stance">{personaB.stance}</div>
          <div className="btn-vote btn-vote-b">Vote for {personaB.name}</div>
        </button>
      </div>
    </div>
  );
}
