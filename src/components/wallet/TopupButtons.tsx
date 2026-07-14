import { TOPUP_PRESETS, formatCents } from '../../lib/constants';
import { BUTTONS } from '../../lib/assets';
import ImageButton from '../ui/ImageButton';

interface TopupButtonsProps {
  onTopup: (amountCents: number) => void;
  disabled: boolean;
}

export default function TopupButtons({ onTopup, disabled }: TopupButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TOPUP_PRESETS.map((amount) => (
        <ImageButton
          key={amount}
          onClick={() => onTopup(amount)}
          disabled={disabled}
          base={BUTTONS.topup_default}
          hover={BUTTONS.topup_hover}
          pressed={BUTTONS.topup_pressed}
          style={{ minHeight: 72 }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span
              style={{
                fontFamily: "'Metal Mania', 'Cinzel', Georgia, serif",
                fontSize: 24,
                fontWeight: 700,
                color: '#F5D060',
                textShadow: '0 0 6px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.8)',
                lineHeight: 1,
              }}
            >
              {formatCents(amount)}
            </span>
          </div>
        </ImageButton>
      ))}
    </div>
  );
}
