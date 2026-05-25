import { useState } from 'react';
import { type PilotLevel, resolveChoiceImages } from '../lib/testMode';
import { BUTTONS } from '../lib/assets';
import GameBackground from '../components/game/GameBackground';
import GameHUD from '../components/game/GameHUD';
import GamePanel from '../components/game/GamePanel';
import ImageButton from '../components/ui/ImageButton';
import TestModeBadge from '../components/ui/TestModeBadge';
import EmberParticles from '../components/fx/EmberParticles';

interface TestLevelPageProps {
  level: PilotLevel;
  levelId: number;
}

type ChoiceResult = 'survive' | 'die' | null;

export default function TestLevelPage({ level, levelId }: TestLevelPageProps) {
  const [chosen, setChosen] = useState<'left' | 'right' | null>(null);
  const [result, setResult] = useState<ChoiceResult>(null);

  const leftImages  = resolveChoiceImages(level.choices.left);
  const rightImages = resolveChoiceImages(level.choices.right);

  const handleChoice = (side: 'left' | 'right') => {
    if (chosen) return;
    setChosen(side);
    const outcomes: ChoiceResult[] = ['survive', 'die'];
    setResult(outcomes[Math.floor(Math.random() * outcomes.length)]);
  };

  const handleReset = () => {
    setChosen(null);
    setResult(null);
  };

  const survived = result === 'survive';

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', overflow: 'hidden' }}>
      <TestModeBadge levelId={levelId} />

      <GameBackground videoSrc={level.bg_video} />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: 'radial-gradient(ellipse at 50% 35%, transparent 25%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />

      <EmberParticles />

      <GameHUD streak={0} potCents={0} />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 100,
          paddingBottom: 40,
          paddingLeft: 20,
          paddingRight: 20,
          gap: 24,
        }}
      >
        <GamePanel
          size="medium"
          style={{ width: '100%', maxWidth: 360 }}
        >
          <div
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#6B655C',
              marginBottom: 6,
            }}
          >
            Level {level.id}
          </div>
          <div
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: 20,
              fontWeight: 700,
              color: '#F5D060',
              textShadow: '0 0 16px rgba(255,180,40,0.3)',
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            {level.name}
          </div>
          <div
            style={{
              fontSize: 13,
              color: '#9E9688',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            {level.objective_text}
          </div>
        </GamePanel>

        {result && (
          <GamePanel
            size="small"
            style={{ width: '100%', maxWidth: 280 }}
          >
            <div
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 22,
                fontWeight: 700,
                color: survived ? '#F5D060' : '#7A0F0F',
                textShadow: survived
                  ? '0 0 20px rgba(255,180,40,0.4)'
                  : '0 0 20px rgba(122,15,15,0.5)',
                textAlign: 'center',
              }}
            >
              {survived ? 'SURVIVED' : 'ELIMINATED'}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#6B655C',
                textAlign: 'center',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginTop: 4,
              }}
            >
              {survived ? 'You chose wisely' : 'The gate was a trap'}
            </div>
          </GamePanel>
        )}

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <ImageButton
              onClick={() => handleChoice('left')}
              disabled={Boolean(chosen)}
              base={leftImages.default}
              hover={leftImages.hover}
              pressed={leftImages.pressed}
              imageAlt="Left choice"
              imageClassName={[
                'object-contain transition-all duration-200',
                chosen === 'left' ? 'opacity-100 scale-105' : chosen ? 'opacity-40 grayscale' : '',
              ].join(' ')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: chosen ? 'default' : 'pointer',
                width: 120,
                height: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
            <GamePanel
              size="small"
              style={{ padding: '6px 16px', minWidth: 80 }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: chosen === 'left' ? '#F5D060' : '#9E9688',
                }}
              >
                LEFT
              </span>
            </GamePanel>
          </div>

          <div
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: 12,
              color: '#4A453E',
              letterSpacing: '0.15em',
              paddingBottom: 40,
            }}
          >
            VS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <ImageButton
              onClick={() => handleChoice('right')}
              disabled={Boolean(chosen)}
              base={rightImages.default}
              hover={rightImages.hover}
              pressed={rightImages.pressed}
              imageAlt="Right choice"
              imageClassName={[
                'object-contain transition-all duration-200',
                chosen === 'right' ? 'opacity-100 scale-105' : chosen ? 'opacity-40 grayscale' : '',
              ].join(' ')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: chosen ? 'default' : 'pointer',
                width: 120,
                height: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
            <GamePanel
              size="small"
              style={{ padding: '6px 16px', minWidth: 80 }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: chosen === 'right' ? '#F5D060' : '#9E9688',
                }}
              >
                RIGHT
              </span>
            </GamePanel>
          </div>
        </div>

        {result && (
          <ImageButton
            onClick={handleReset}
            variant="carved-green"
            base={BUTTONS.return_default}
            hover={BUTTONS.return_hover}
            pressed={BUTTONS.return_pressed}
            style={{ marginTop: 8 }}
          >
            <span style={{ fontSize: 11, letterSpacing: '0.1em' }}>TRY AGAIN</span>
          </ImageButton>
        )}
      </div>
    </div>
  );
}
