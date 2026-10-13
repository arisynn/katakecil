import React, { useEffect, useRef } from 'react';
import { AlignJustify, AlignLeft, Check, Columns2, Minus, Moon, Plus, Square, Sun, Type, X } from 'lucide-react';
import type { FontFamily, LineHeight, MarginWidth, ReadingSettings } from '../types/reader';
import type { UiTheme } from '../hooks/useUiTheme';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: ReadingSettings;
  onUpdateSettings: (next: Partial<ReadingSettings>) => void;
  appTheme: UiTheme;
  onAppThemeChange: (next: UiTheme) => void;
}
const fonts: { id: FontFamily; label: string }[] = [
  { id: 'literata', label: 'Serif' },
  { id: 'sans', label: 'Sans' },
  { id: 'merriweather', label: 'Classic' },
];
const lines: { id: LineHeight; label: string }[] = [
  { id: 'compact', label: 'Rapat' },
  { id: 'normal', label: 'Normal' },
  { id: 'loose', label: 'Lega' },
];
const widths: { id: MarginWidth; label: string }[] = [
  { id: 'narrow', label: 'Lebar' },
  { id: 'normal', label: 'Sedang' },
  { id: 'wide', label: 'Sempit' },
];

export function ReadingSettingsModal({
  isOpen, onClose, settings, onUpdateSettings, appTheme, onAppThemeChange,
}: Props) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeHandlerRef = useRef(onClose);
  closeHandlerRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeHandlerRef.current(); }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),summary,[tabindex="0"]',
      ) ?? []).filter(element => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [isOpen]);

  if (!isOpen) return null;
  const size = Math.max(90, Math.min(160, settings.fontSize));

  return <div className="v6-reader-settings-scrim v610-settings-scrim" onClick={onClose} role="presentation">
    <section
      ref={dialogRef} className="v6-reader-settings v610-settings-sheet"
      data-reader-settings-theme={appTheme} role="dialog" aria-modal="true"
      aria-labelledby="v610-settings-title" onClick={event => event.stopPropagation()}
    >
      <div className="v610-sheet-handle" aria-hidden="true" />
      <div className="v6-reader-settings-header">
        <h2 id="v610-settings-title">Pengaturan Membaca</h2>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Tutup pengaturan"><X size={20} /></button>
      </div>
      <div className="v6-reader-settings-scroll">
        <section className="v6-reader-settings-group">
          <h3>Tampilan <small>Untuk seluruh KataKecil</small></h3>
          <div className="v64-global-theme-choices v610-theme-choices" role="group" aria-label="Tema global">
            <button type="button" className={appTheme === 'light' ? 'selected' : ''} aria-pressed={appTheme === 'light'} onClick={() => onAppThemeChange('light')}>
              <span className="v610-theme-icon v610-theme-light"><Sun size={22} /></span>
              <span>Terang</span>{appTheme === 'light' && <Check size={16} aria-hidden="true" />}
            </button>
            <button type="button" className={appTheme === 'dark' ? 'selected' : ''} aria-pressed={appTheme === 'dark'} onClick={() => onAppThemeChange('dark')}>
              <span className="v610-theme-icon v610-theme-dark"><Moon size={22} /></span>
              <span>Gelap</span>{appTheme === 'dark' && <Check size={16} aria-hidden="true" />}
            </button>
          </div>
        </section>
        <section className="v6-reader-settings-group">
          <h3>Ukuran Teks <span>{size}%</span></h3>
          <div className="v6-slider-row v610-size-slider">
            <button type="button" disabled={size <= 90} aria-label="Perkecil teks" onClick={() => onUpdateSettings({ fontSize: Math.max(90, size - 10) })}><Minus size={18} /></button>
            <span aria-hidden="true">A</span>
            <input type="range" min={90} max={160} step={10} value={size} aria-label="Ukuran teks" onChange={event => onUpdateSettings({ fontSize: Number(event.target.value) })} />
            <span className="large" aria-hidden="true">A</span>
            <button type="button" disabled={size >= 160} aria-label="Perbesar teks" onClick={() => onUpdateSettings({ fontSize: Math.min(160, size + 10) })}><Plus size={18} /></button>
          </div>
        </section>
        <section className="v6-reader-settings-group">
          <h3>Jenis Font</h3>
          <div className="v6-settings-segments v610-font-options" role="group" aria-label="Jenis font">
            {fonts.map(font => <button type="button" key={font.id} aria-pressed={settings.fontFamily === font.id} className={settings.fontFamily === font.id ? 'selected' : ''} onClick={() => onUpdateSettings({ fontFamily: font.id })}>{font.label}</button>)}
          </div>
        </section>
        <details className="v610-advanced-settings">
          <summary><span><Type size={17} /> Pengaturan Lanjutan</span><small>Jarak baris, margin, perataan, halaman</small></summary>
          <div className="v610-advanced-body">
            <section className="v6-reader-settings-group">
              <h3>Jarak Baris</h3>
              <div className="v6-settings-segments" role="group" aria-label="Jarak baris">
                {lines.map(line => <button type="button" key={line.id} aria-pressed={settings.lineHeight === line.id} className={settings.lineHeight === line.id ? 'selected' : ''} onClick={() => onUpdateSettings({ lineHeight: line.id })}>{line.label}</button>)}
              </div>
            </section>
            <section className="v6-reader-settings-group">
              <h3>Lebar Halaman</h3>
              <div className="v6-settings-segments" role="group" aria-label="Lebar halaman">
                {widths.map(width => <button type="button" key={width.id} aria-pressed={settings.marginWidth === width.id} className={settings.marginWidth === width.id ? 'selected' : ''} onClick={() => onUpdateSettings({ marginWidth: width.id })}>{width.label}</button>)}
              </div>
            </section>
            <section className="v6-reader-settings-group">
              <h3>Perataan Teks</h3>
              <div className="v6-settings-segments" role="group" aria-label="Perataan teks">
                <button type="button" aria-pressed={settings.textAlign === 'left'} className={settings.textAlign === 'left' ? 'selected' : ''} onClick={() => onUpdateSettings({ textAlign: 'left' })}><AlignLeft size={16} /> Kiri</button>
                <button type="button" aria-pressed={settings.textAlign === 'justify'} className={settings.textAlign === 'justify' ? 'selected' : ''} onClick={() => onUpdateSettings({ textAlign: 'justify' })}><AlignJustify size={16} /> Rata kiri-kanan</button>
              </div>
            </section>
            <section className="v6-reader-settings-group">
              <h3>Mode Halaman <small>Layar lebar</small></h3>
              <div className="v6-settings-segments" role="group" aria-label="Mode halaman">
                <button type="button" aria-pressed={settings.spreadMode === 'single'} className={settings.spreadMode === 'single' ? 'selected' : ''} onClick={() => onUpdateSettings({ spreadMode: 'single' })}><Square size={16} /> Satu</button>
                <button type="button" aria-pressed={settings.spreadMode === 'spread'} className={settings.spreadMode === 'spread' ? 'selected' : ''} onClick={() => onUpdateSettings({ spreadMode: 'spread' })}><Columns2 size={16} /> Dua</button>
              </div>
            </section>
            <section className="v6-reader-settings-group">
              <h3>Font Monospace</h3>
              <div className="v6-settings-segments"><button type="button" className={settings.fontFamily === 'mono' ? 'selected' : ''} aria-pressed={settings.fontFamily === 'mono'} onClick={() => onUpdateSettings({ fontFamily: 'mono' })}>Gunakan Mono</button></div>
            </section>
          </div>
        </details>
      </div>
      <div className="v6-reader-settings-footer"><Check size={16} /> Preferensi tersimpan di perangkat ini.</div>
    </section>
  </div>;
}
