import type { Persona } from '../types';

interface Props {
  personaA: Persona;
  personaB: Persona;
  topic: string;
  onProceed: () => void;
}

export default function DebateComplete({ personaA, personaB, topic, onProceed }: Props) {
  return (
    <div className="screen debate-complete-screen">
      <div className="debate-complete-badge">⚖️ Debate concluded</div>

      <div className="debate-complete-header">
        <h2>The arguments are in.</h2>
        <p className="debate-complete-topic">"{topic}"</p>
        <p className="debate-complete-sub">
          Take a moment to reflect on what you heard before casting your vote.
        </p>
      </div>

      <div className="debate-complete-recap">
        <div className="recap-card side-a">
          <span className="recap-emoji">{personaA.emoji}</span>
          <div>
            <div className="recap-name">{personaA.name}</div>
            <div className="recap-stance">{personaA.stance}</div>
          </div>
        </div>

        <div className="recap-vs">VS</div>

        <div className="recap-card side-b">
          <span className="recap-emoji">{personaB.emoji}</span>
          <div>
            <div className="recap-name">{personaB.name}</div>
            <div className="recap-stance">{personaB.stance}</div>
          </div>
        </div>
      </div>

      <button className="btn-primary btn-vote-now" onClick={onProceed}>
        🗳️ Cast my vote
      </button>
    </div>
  );
}
