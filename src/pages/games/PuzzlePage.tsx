import { useState, useEffect } from 'react';
import { Puzzle, ChevronLeft, HelpCircle, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ICONS, BUTTONS, BACKGROUNDS } from '../../lib/assets';
import AssetIcon from '../../components/ui/AssetIcon';
import { useDailyPuzzle } from '../../hooks/useDailyGames';
import { useQualification } from '../../hooks/useQualification';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ImageButton from '../../components/ui/ImageButton';
import type { PuzzleResult } from '../../lib/types';

const BG = BACKGROUNDS.ritual_floor;

export default function PuzzlePage() {
  const navigate = useNavigate();
  const { play, loading, error } = useDailyPuzzle();
  const { todayProgress, fetchQualification } = useQualification();
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<PuzzleResult | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [questionLoading, setQuestionLoading] = useState(true);
  const [hint, setHint] = useState('');
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    fetchQualification();
    async function loadPuzzle() {
      setQuestionLoading(true);
      const [{ data: q }, { data: h }] = await Promise.all([
        supabase.from('settings').select('value_json').eq('key', 'daily_puzzle_question').maybeSingle(),
        supabase.from('settings').select('value_json').eq('key', 'daily_puzzle_hint').maybeSingle(),
      ]);
      const q_str = q?.value_json ? String(q.value_json).replace(/^"|"$/g, '').trim() : '';
      setQuestion(q_str || null);
      if (h?.value_json) setHint(String(h.value_json).replace(/^"|"$/g, '').trim());
      setQuestionLoading(false);
    }
    loadPuzzle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alreadyPlayed = !result && todayProgress.some((p) => p.game_id === 'daily_puzzle' && p.played_today);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    const res = await play(answer.trim());
    if (res) {
      setResult(res);
      fetchQualification();
    }
  };

  // Shared full-screen scene wrapper
  function SceneWrapper({ children }: { children: React.ReactNode }) {
    return (
      <div className="animate-scene-enter" style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Background */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${BG})`,
          backgroundSize: 'cover', backgroundPosition: 'center top', zIndex: 0,
        }} />
        {/* Vignette */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 35%, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.78) 100%)',
          zIndex: 1, pointerEvents: 'none',
        }} />
        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', flexDirection: 'column', flex: 1,
          paddingTop: 'max(env(safe-area-inset-top, 0px), 20px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
          paddingLeft: 20, paddingRight: 20,
          overflowY: 'auto',
        }}>
          {children}
        </div>
      </div>
    );
  }

  // Already played
  if (alreadyPlayed) {
    return (
      <SceneWrapper>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <div style={{
            width: 72, height: 72,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(11,15,12,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Moon size={32} strokeWidth={1.2} style={{ color: 'rgba(255,255,255,0.25)' }} />
          </div>
          <div style={{ textAlign: 'center', maxWidth: 260 }}>
            <h2 style={{
              fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
              fontSize: 20, letterSpacing: '0.06em',
              color: 'rgba(255,255,255,0.55)', marginBottom: 10,
              textShadow: '0 1px 6px rgba(0,0,0,0.9)',
            }}>
              Already Played
            </h2>
            <p style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: 14, lineHeight: 1.65,
              color: 'rgba(255,255,255,0.4)', margin: 0,
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}>
              You've already completed today's puzzle. Come back tomorrow for another attempt.
            </p>
          </div>
          <ImageButton
            onClick={() => navigate('/')}
            base={BUTTONS.return_default}
            hover={BUTTONS.return_hover}
            pressed={BUTTONS.return_pressed}
            style={{ width: '100%', maxWidth: 340 }}
          >
            <span style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 24, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F5D060' }}>
              Back to Home
            </span>
          </ImageButton>
        </div>
      </SceneWrapper>
    );
  }

  // Result screen
  if (result) {
    return (
      <SceneWrapper>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }} className="animate-fade-in">
          <div style={{
            width: 88, height: 88,
            border: `1px solid ${result.won ? 'rgba(245,208,96,0.35)' : 'rgba(255,255,255,0.08)'}`,
            background: result.won ? 'rgba(245,208,96,0.06)' : 'rgba(11,15,12,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AssetIcon
              src={ICONS.puzzle}
              fallback={Puzzle}
              size={44}
              style={{ opacity: result.won ? 1 : 0.35, filter: result.won ? 'drop-shadow(0 0 10px rgba(245,208,96,0.5))' : 'none' }}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
              fontSize: 32, fontWeight: 700,
              color: result.won ? '#F5D060' : 'rgba(255,255,255,0.45)',
              textShadow: result.won
                ? '0 0 20px rgba(245,208,96,0.4), 0 2px 6px rgba(0,0,0,0.9)'
                : '0 2px 6px rgba(0,0,0,0.9)',
              letterSpacing: '0.06em',
            }}>
              {result.won ? 'CORRECT' : 'WRONG'}
            </div>
            {!result.won && (
              <p style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: 13, marginTop: 8,
                color: 'rgba(255,255,255,0.45)',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}>
                The answer was:{' '}
                <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{result.correct_answer}</span>
              </p>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
              fontSize: 28, fontWeight: 700,
              color: result.won ? '#F5D060' : 'rgba(255,255,255,0.45)',
              textShadow: '0 0 12px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.9)',
            }}>
              +{result.points_earned}
            </div>
            <div style={{
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.35)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              Points earned
            </div>
          </div>

          <ImageButton
            onClick={() => navigate('/games')}
            base={BUTTONS.return_default}
            hover={BUTTONS.return_hover}
            pressed={BUTTONS.return_pressed}
            style={{ width: '100%', maxWidth: 340 }}
          >
            <span style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 24, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F5D060' }}>
              Back to Games
            </span>
          </ImageButton>
        </div>
      </SceneWrapper>
    );
  }

  // Active puzzle
  return (
    <SceneWrapper>
      {/* Back button */}
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => navigate('/games')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.5)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px 0', transition: 'color 0.15s ease',
            fontFamily: "'Inter', system-ui, sans-serif",
            WebkitTapHighlightColor: 'transparent',
          } as React.CSSProperties}
        >
          <ChevronLeft size={15} />
          Games
        </button>
      </div>

      {/* Game header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{
          width: 44, height: 44,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(11,15,12,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <AssetIcon src={ICONS.puzzle} fallback={Puzzle} size={22} style={{ opacity: 0.85 }} />
        </div>
        <div>
          <h1 style={{
            fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
            fontSize: 18, letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.85)', margin: 0,
            textShadow: '0 1px 6px rgba(0,0,0,0.9)',
          }}>
            Daily Puzzle
          </h1>
          <p style={{
            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.35)', margin: 0,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            One attempt today
          </p>
        </div>
      </div>

      {/* Question box */}
      <div style={{
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(0,0,0,0.35)',
        padding: '18px 16px', marginBottom: 14,
      }}>
        <p style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: 15, lineHeight: 1.65,
          color: 'rgba(255,255,255,0.85)', margin: 0,
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}>
          {questionLoading
            ? 'Loading today\'s puzzle…'
            : question ?? 'No puzzle has been set for today. Check back later.'}
        </p>
      </div>

      {/* Hint */}
      {hint && (
        <div style={{ marginBottom: 14 }}>
          <button
            onClick={() => setShowHint(!showHint)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.4)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, transition: 'color 0.15s ease',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <AssetIcon src={ICONS.help} fallback={HelpCircle} size={12} />
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </button>
          {showHint && (
            <p style={{
              marginTop: 8, fontSize: 11,
              color: 'rgba(255,255,255,0.45)',
              borderLeft: '2px solid rgba(255,255,255,0.15)',
              paddingLeft: 12,
              fontFamily: "'Lora', Georgia, serif",
              lineHeight: 1.6,
            }} className="animate-fade-in">
              {hint}
            </p>
          )}
        </div>
      )}

      {/* Answer + submit */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer..."
          className="ritual-input w-full"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        {error && (
          <div style={{
            border: '1px solid rgba(180,30,30,0.3)',
            background: 'rgba(60,0,0,0.45)',
            padding: '10px 14px', textAlign: 'center',
            fontSize: 13, color: '#CC4444', lineHeight: 1.5,
            fontFamily: "'Lora', Georgia, serif",
          }}>
            {error}
          </div>
        )}

        <ImageButton
          onClick={handleSubmit}
          disabled={!answer.trim() || loading || !question}
          base={BUTTONS.submit_default}
          hover={BUTTONS.submit_hover}
          pressed={BUTTONS.submit_pressed}
          style={{ width: '100%' }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LoadingSpinner size="sm" />
              <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
                Checking...
              </span>
            </span>
          ) : (
            <span style={{ fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif", fontSize: 24, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F5D060' }}>
              Submit Answer
            </span>
          )}
        </ImageButton>
      </div>
    </SceneWrapper>
  );
}
