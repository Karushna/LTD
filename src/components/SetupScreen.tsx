import { useState } from 'react';
import type { Level } from '../types';
import { LEVEL_LABELS, LEVEL_DESCRIPTIONS, SUGGESTED_TOPICS } from '../types';

interface Props {
  onStart: (topic: string, level: Level) => void;
  error: string | null;
  isLoading: boolean;
}

export default function SetupScreen({ onStart, error, isLoading }: Props) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<Level>('high');

  const handleStart = () => {
    const trimmed = topic.trim();
    if (trimmed.length < 4) return;
    onStart(trimmed, level);
  };

  const levels: Level[] = ['elementary', 'middle', 'high', 'college'];

  const apiKeyMissing = !import.meta.env.VITE_OPENAI_API_KEY;

  return (
    <div className="screen setup-screen">
      <div className="card setup-card">
        <div className="logo">
          <span className="logo-emoji">⚖️</span>
          <h1>Learn Through Debate</h1>
          <p>Watch two AI experts argue both sides — then you decide who's right.</p>
        </div>

        {apiKeyMissing && (
          <div className="error-banner">
            <strong>API key not set.</strong> Create a <code>.env</code> file in the project root
            with <code>VITE_OPENAI_API_KEY=your_key</code> and restart the dev server.
          </div>
        )}

        {error && !apiKeyMissing && <div className="error-banner">{error}</div>}

        <label className="field-label" htmlFor="topic-input">
          Debate Topic
        </label>
        <input
          id="topic-input"
          className="topic-input"
          type="text"
          placeholder="e.g. Is light a wave or a particle?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          maxLength={120}
        />

        <p className="suggested-label">Or choose a suggestion:</p>
        <div className="chips">
          {SUGGESTED_TOPICS.map((t) => (
            <button key={t} className="chip" onClick={() => setTopic(t)}>
              {t}
            </button>
          ))}
        </div>

        <label className="field-label">Your Level</label>
        <div className="level-grid">
          {levels.map((l) => (
            <button
              key={l}
              className={`level-option${level === l ? ' selected' : ''}`}
              onClick={() => setLevel(l)}
            >
              <span className="level-option-name">{LEVEL_LABELS[l]}</span>
              <span className="level-option-desc">{LEVEL_DESCRIPTIONS[l]}</span>
            </button>
          ))}
        </div>

        <button
          className="btn-primary"
          disabled={topic.trim().length < 4 || isLoading || apiKeyMissing}
          onClick={handleStart}
        >
          {isLoading ? 'Setting up debate…' : '⚔️  Start the Debate'}
        </button>

        <p className="api-key-notice">
          Powered by GPT-4o. API key stays in your browser and is never sent elsewhere.
        </p>
      </div>
    </div>
  );
}
