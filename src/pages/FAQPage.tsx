import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../context/I18nContext';

const UF = "'Inter', system-ui, sans-serif";
const BF = "'Lora', Georgia, serif";
const FF = "'Metal Mania', 'Cinzel', Georgia, serif";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  enabled: boolean;
}

export default function FAQPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const [items, setItems] = useState<FaqItem[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('faq_items')
      .select('id, question, answer, sort_order, enabled')
      .eq('enabled', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setItems((data ?? []) as FaqItem[]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="pg-transition pg-transition--fade-up" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 16px 0',
        marginBottom: 24,
      }}>
        <button
          onClick={() => navigate('/settings')}
          style={{
            width: 36, height: 36,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; }}
        >
          <ChevronLeft size={18} style={{ color: 'rgba(255,255,255,0.6)' }} />
        </button>
        <div>
          <div style={{ fontFamily: FF, fontSize: 18, letterSpacing: '0.05em', color: '#D8D0C5' }}>
            {t('settings.faq_title')}
          </div>
          <div style={{ fontFamily: UF, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {t('settings.faq_subtitle')}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: UF, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            {t('common.loading') ?? 'Loading…'}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{
            padding: '48px 24px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 52, height: 52,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <HelpCircle size={22} strokeWidth={1.3} style={{ color: 'rgba(255,255,255,0.25)' }} />
            </div>
            <p style={{ fontFamily: BF, fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: 0 }}>
              No FAQ items available yet.
            </p>
          </div>
        )}

        {!loading && items.map((item) => {
          const isOpen = open === item.id;
          return (
            <div
              key={item.id}
              style={{
                border: `1px solid ${isOpen ? 'rgba(255,122,0,0.22)' : 'rgba(255,255,255,0.05)'}`,
                background: isOpen ? 'rgba(255,122,0,0.03)' : 'rgba(255,255,255,0.02)',
                transition: 'border-color 0.2s ease, background 0.2s ease',
              }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : item.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '14px 16px',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{
                  fontFamily: UF, fontSize: 14, fontWeight: 500,
                  color: isOpen ? '#FF9A30' : 'rgba(255,255,255,0.8)',
                  lineHeight: 1.3, flex: 1, paddingRight: 10,
                }}>
                  {item.question}
                </span>
                <ChevronDown
                  size={15}
                  style={{
                    color: isOpen ? '#FF9A30' : 'rgba(255,255,255,0.3)',
                    flexShrink: 0,
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease, color 0.2s ease',
                  }}
                />
              </button>
              {isOpen && (
                <div style={{ padding: '0 16px 16px' }}>
                  <p style={{
                    fontFamily: BF, fontSize: 13, color: 'rgba(255,255,255,0.55)',
                    lineHeight: 1.7, margin: 0,
                  }}>
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
