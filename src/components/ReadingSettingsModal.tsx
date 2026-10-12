import React from 'react';
import {
  X,
  AlignLeft,
  AlignJustify,
  Minus,
  Plus,
  Check,
  Columns,
  Square,
} from 'lucide-react';
import {
  FontFamily,
  LineHeight,
  MarginWidth,
  ReadingSettings,
  TextAlign,
  ThemeColors,
  ThemeMode,
} from '../types/reader';
import { THEMES } from '../utils/theme';

interface ReadingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReadingSettings;
  theme: ThemeColors;
  onUpdateSettings: (newSettings: Partial<ReadingSettings>) => void;
}

export const ReadingSettingsModal: React.FC<ReadingSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  theme,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const fontOptions: { id: FontFamily; label: string; sample: string; className: string }[] = [
    { id: 'literata', label: 'Literata', sample: 'Serif untuk novel', className: 'font-literata' },
    { id: 'sans', label: 'Sans-Serif', sample: 'Sans yang bersih', className: 'font-playbooks-sans' },
    { id: 'merriweather', label: 'Merriweather', sample: 'Editorial book serif', className: 'font-merriweather' },
    { id: 'mono', label: 'Monospace', sample: 'Typewriter mono', className: 'font-mono' },
  ];

  const themeOptions: { id: ThemeMode; label: string; bg: string; text: string; border: string }[] =
    (['white','sepia','night','black'] as ThemeMode[]).map(id=>({id,label:THEMES[id].label,bg:THEMES[id].pageBg,text:THEMES[id].text,border:THEMES[id].border}));

  const handleDecreaseFont = () => {
    if (settings.fontSize > 70) {
      onUpdateSettings({ fontSize: settings.fontSize - 10 });
    }
  };

  const handleIncreaseFont = () => {
    if (settings.fontSize < 160) {
      onUpdateSettings({ fontSize: settings.fontSize + 10 });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 border transition-all max-h-[90vh] overflow-y-auto custom-scrollbar backdrop-blur-2xl"
        style={{
          backgroundColor: theme.barBg,
          borderColor: theme.border,
          color: theme.text,
          boxShadow: '0 24px 60px -8px rgba(0, 0, 0, 0.3), 0 4px 16px -2px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-lg tracking-tight">Aa</span>
            <span className="text-sm font-semibold tracking-tight font-playbooks-sans">Tampilan Pembaca</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-75 transition-opacity"
            style={{ color: theme.secondaryText }}
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Theme Palette Selector */}
        <div className="mb-5">
          <label className="block text-xs font-medium uppercase tracking-wider mb-2.5 font-playbooks-sans" style={{ color: theme.secondaryText }}>
            Tema Warna
          </label>
          <div className="grid grid-cols-4 gap-2.5">
            {themeOptions.map((t) => {
              const isActive = settings.theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onUpdateSettings({ theme: t.id })}
                  className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-medium transition-all relative group active:scale-95"
                  style={{
                    backgroundColor: t.bg,
                    color: t.text,
                    borderColor: isActive ? theme.accent : t.border,
                    boxShadow: isActive ? `0 0 0 2px ${theme.accent}` : 'none',
                  }}
                >
                  <span className="truncate">{t.label}</span>
                  {isActive && (
                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center mt-1"
                      style={{ backgroundColor: theme.accent, color: '#FFFFFF' }}
                    >
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Font Size Stepper */}
        <div className="mb-5">
          <label className="block text-xs font-medium uppercase tracking-wider mb-2 font-playbooks-sans" style={{ color: theme.secondaryText }}>
            Ukuran Teks ({settings.fontSize}%)
          </label>
          <div
            className="flex items-center justify-between p-1.5 rounded-xl border"
            style={{ borderColor: theme.border, backgroundColor: theme.cardBg }}
          >
            <button
              onClick={handleDecreaseFont}
              disabled={settings.fontSize <= 70}
              className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg font-serif font-bold text-sm hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
              style={{ color: theme.text }}
              title="Perkecil teks"
            >
              <Minus className="w-4 h-4 mr-1" />
              <span className="text-xs">A</span>
            </button>

            <span className="text-sm font-semibold tabular-nums font-playbooks-sans" style={{ color: theme.text }}>
              {settings.fontSize}%
            </span>

            <button
              onClick={handleIncreaseFont}
              disabled={settings.fontSize >= 160}
              className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg font-serif font-bold text-sm hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
              style={{ color: theme.text }}
              title="Perbesar teks"
            >
              <span className="text-base">A</span>
              <Plus className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* 3. Font Family Selector */}
        <div className="mb-5">
          <label className="block text-xs font-medium uppercase tracking-wider mb-2 font-playbooks-sans" style={{ color: theme.secondaryText }}>
            Jenis Huruf
          </label>
          <div className="grid grid-cols-2 gap-2">
            {fontOptions.map((f) => {
              const isActive = settings.fontFamily === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => onUpdateSettings({ fontFamily: f.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between active:scale-98 ${f.className}`}
                  style={{
                    backgroundColor: isActive ? theme.hoverBg : theme.cardBg,
                    borderColor: isActive ? theme.accent : theme.border,
                    boxShadow: isActive ? `0 0 0 1.5px ${theme.accent}` : 'none',
                    color: theme.text,
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium">{f.label}</span>
                    {isActive && <Check className="w-4 h-4" style={{ color: theme.accent }} />}
                  </div>
                  <span className="text-[11px] opacity-70 mt-0.5 truncate">{f.sample}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Alignment & Line Spacing */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Alignment */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-2 font-playbooks-sans" style={{ color: theme.secondaryText }}>
              Perataan Teks
            </label>
            <div className="flex items-center p-1 rounded-xl border gap-1" style={{ borderColor: theme.border, backgroundColor: theme.cardBg }}>
              <button
                onClick={() => onUpdateSettings({ textAlign: 'justify' })}
                className="flex-1 py-1.5 flex items-center justify-center rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: settings.textAlign === 'justify' ? theme.bg : 'transparent',
                  color: theme.text,
                  boxShadow: settings.textAlign === 'justify' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
                title="Rata Kiri Kanan"
              >
                <AlignJustify className="w-4 h-4 mr-1.5" />
                <span>Rata</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ textAlign: 'left' })}
                className="flex-1 py-1.5 flex items-center justify-center rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: settings.textAlign === 'left' ? theme.bg : 'transparent',
                  color: theme.text,
                  boxShadow: settings.textAlign === 'left' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
                title="Rata Kiri"
              >
                <AlignLeft className="w-4 h-4 mr-1.5" />
                <span>Kiri</span>
              </button>
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-2 font-playbooks-sans" style={{ color: theme.secondaryText }}>
              Jarak Baris
            </label>
            <div className="flex items-center p-1 rounded-xl border gap-1" style={{ borderColor: theme.border, backgroundColor: theme.cardBg }}>
              {(['compact', 'normal', 'loose'] as LineHeight[]).map((lh) => {
                const isActive = settings.lineHeight === lh;
                const labels: Record<LineHeight, string> = {
                  compact: 'Rapat',
                  normal: 'Sedang',
                  loose: 'Renggang',
                };
                return (
                  <button
                    key={lh}
                    onClick={() => onUpdateSettings({ lineHeight: lh })}
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all"
                    style={{
                      backgroundColor: isActive ? theme.bg : 'transparent',
                      color: theme.text,
                      boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {labels[lh]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. Margin Width & Spread Mode */}
        <div className="grid grid-cols-2 gap-3">
          {/* Margins */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-2 font-playbooks-sans" style={{ color: theme.secondaryText }}>
              Margin Halaman
            </label>
            <div className="flex items-center p-1 rounded-xl border gap-1" style={{ borderColor: theme.border, backgroundColor: theme.cardBg }}>
              {(['narrow', 'normal', 'wide'] as MarginWidth[]).map((m) => {
                const isActive = settings.marginWidth === m;
                const labels: Record<MarginWidth, string> = {
                  narrow: 'Sempit',
                  normal: 'Normal',
                  wide: 'Lebar',
                };
                return (
                  <button
                    key={m}
                    onClick={() => onUpdateSettings({ marginWidth: m })}
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all"
                    style={{
                      backgroundColor: isActive ? theme.bg : 'transparent',
                      color: theme.text,
                      boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {labels[m]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Spread (Single vs 2-page) */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-2 font-playbooks-sans" style={{ color: theme.secondaryText }}>
              Tata Letak (Layar Lebar)
            </label>
            <div className="flex items-center p-1 rounded-xl border gap-1" style={{ borderColor: theme.border, backgroundColor: theme.cardBg }}>
              <button
                onClick={() => onUpdateSettings({ spreadMode: 'single' })}
                className="flex-1 py-1.5 flex items-center justify-center rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: settings.spreadMode === 'single' ? theme.bg : 'transparent',
                  color: theme.text,
                  boxShadow: settings.spreadMode === 'single' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Square className="w-3.5 h-3.5 mr-1" />
                <span>1 Halaman</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ spreadMode: 'spread' })}
                className="flex-1 py-1.5 flex items-center justify-center rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: settings.spreadMode === 'spread' ? theme.bg : 'transparent',
                  color: theme.text,
                  boxShadow: settings.spreadMode === 'spread' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Columns className="w-3.5 h-3.5 mr-1" />
                <span>2 Halaman</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
