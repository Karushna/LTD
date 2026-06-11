import { useState } from 'react';
import type { Level } from '../types';
import { SUGGESTED_TOPICS } from '../types';

interface Props {
  onStart: (topic: string, level: Level) => void;
  error: string | null;
  isLoading: boolean;
}

const LEVELS: { id: Level; icon: string; name: string; desc: string }[] = [
  { id: 'elementary', icon: '🌱', name: 'Elementary',    desc: 'Grades K – 5' },
  { id: 'middle',     icon: '📖', name: 'Middle School', desc: 'Grades 6 – 8' },
  { id: 'high',       icon: '🎓', name: 'High School',   desc: 'Grades 9 – 12' },
  { id: 'college',    icon: '🏛️', name: 'College',       desc: 'Advanced level' },
];

const TOPIC_ICONS: Record<string, string> = {
  'Is light a wave or a particle?':           '🌊',
  'Was the internet good or bad for society?':'🌐',
  'Should humans colonize Mars?':             '🚀',
  'Is mathematics discovered or invented?':   '∑',
  'Are AI systems truly intelligent?':        '🤖',
  'Was the Industrial Revolution a net positive?': '🏭',
};

export default function SetupScreen({ onStart, error, isLoading }: Props) {
  const [topic, setTopic]   = useState('');
  const [level, setLevel]   = useState<Level>('high');

  const ready = topic.trim().length >= 4;
  const apiKeyMissing = !import.meta.env.VITE_OPENAI_API_KEY;

  const handleStart = () => {
    if (!ready || apiKeyMissing || isLoading) return;
    onStart(topic.trim(), level);
  };

  return (
    <div className="s-page">
      {/* Ambient background blobs */}
      <div className="s-orb s-orb-a" />
      <div className="s-orb s-orb-b" />
      <div className="s-orb s-orb-c" />

      <div className="s-wrapper">

        {/* ── Hero ── */}
        <header className="s-hero">
          <div className="s-badge">
            <span className="s-badge-dot" />
            AI-Powered Debate Learning
          </div>

          <h1 className="s-title">
            Learn Through<br />
            <span className="s-title-glow">Debate</span>
          </h1>

          <p className="s-subtitle">
            Two AI personas clash over any topic at your level.<br />
            Watch, reflect, then cast your verdict.
          </p>

          {/* The two sides hint */}
          <div className="s-sides">
            <div className="s-side s-side-a">
              <span className="s-side-dot" />
              The Proposer
            </div>
            <div className="s-sides-vs">VS</div>
            <div className="s-side s-side-b">
              The Opposer
              <span className="s-side-dot" />
            </div>
          </div>
        </header>

        {/* ── Form card ── */}
        <div className="s-card">

          {/* Banners */}
          {apiKeyMissing && (
            <div className="s-banner s-banner-error">
              <span>⚠️</span>
              <span>
                <strong>API key missing.</strong> Add{' '}
                <code>VITE_OPENAI_API_KEY=…</code> to a <code>.env</code> file and restart.
              </span>
            </div>
          )}
          {error && !apiKeyMissing && (
            <div className="s-banner s-banner-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* ── Topic section ── */}
          <div className="s-section">
            <div className="s-section-header">
              <span className="s-section-icon">💬</span>
              <span className="s-section-label">What should they debate?</span>
            </div>

            <div className="s-input-wrap">
              <input
                id="topic-input"
                className="s-input"
                type="text"
                placeholder="e.g. Is light a wave or a particle?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                maxLength={120}
                autoFocus
              />
              {topic.length > 0 && (
                <button
                  className="s-input-clear"
                  onClick={() => setTopic('')}
                  tabIndex={-1}
                  aria-label="Clear"
                >
                  ×
                </button>
              )}
            </div>

            <p className="s-chips-label">Quick picks</p>
            <div className="s-chips">
              {SUGGESTED_TOPICS.map((t) => (
                <button
                  key={t}
                  className={`s-chip${topic === t ? ' s-chip-active' : ''}`}
                  onClick={() => setTopic(t)}
                >
                  <span className="s-chip-icon">{TOPIC_ICONS[t] ?? '💡'}</span>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* ── Level section ── */}
          <div className="s-section">
            <div className="s-section-header">
              <span className="s-section-icon">🎯</span>
              <span className="s-section-label">Your knowledge level</span>
            </div>

            <div className="s-levels">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  className={`s-level${level === l.id ? ' s-level-selected' : ''}`}
                  onClick={() => setLevel(l.id)}
                >
                  <span className="s-level-icon">{l.icon}</span>
                  <span className="s-level-name">{l.name}</span>
                  <span className="s-level-desc">{l.desc}</span>
                  {level === l.id && <span className="s-level-check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* ── CTA ── */}
          <button
            className="s-cta"
            disabled={!ready || isLoading || apiKeyMissing}
            onClick={handleStart}
          >
            <span className="s-cta-shimmer" />
            <span className="s-cta-content">
              {isLoading ? (
                <>
                  <span className="s-cta-spinner" />
                  Setting up the debate…
                </>
              ) : (
                <>⚔️ &nbsp;Start the Debate</>
              )}
            </span>
          </button>

          <p className="s-notice">🔒 Your API key never leaves your browser</p>
        </div>
      </div>
    </div>
  );
}
