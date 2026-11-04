import EasySpeech from 'easy-speech';
import { sentences, type Sentence } from './search';
export interface SpeechPosition { chapterIndex: number; charOffset: number }
export interface SpeechBoundary { charIndex?: number; charLength?: number; name?: string }
export interface SpeechDriver {
  init(options?: {maxTimeout: number; interval: number}): Promise<unknown>;
  voices(): SpeechSynthesisVoice[];
  speak(options: {text: string; voice?: SpeechSynthesisVoice; rate: number; boundary: (event: SpeechBoundary) => void}): Promise<unknown>;
  pause(): void; resume(): void; cancel(): void;
}
export class ReadAloud {
  state: 'idle' | 'loading' | 'playing' | 'paused' | 'error' = 'idle';
  position: SpeechPosition = {chapterIndex: 0, charOffset: 0};
  voices: SpeechSynthesisVoice[] = [];
  private ready = false;
  private initialization: Promise<void> | null = null;
  private generation = 0;
  private queue: Sentence[] = [];
  private cursor = 0;
  private chapters: {text: string}[] = [];
  private language = 'en';
  private rate = 1;
  private voice?: SpeechSynthesisVoice;
  constructor(private hooks: {
    change: () => void;
    sentence: (position: SpeechPosition, end: number) => void;
    word: (position: SpeechPosition, end: number) => void;
    error: (message: string) => void;
  }, private driver: SpeechDriver = EasySpeech as unknown as SpeechDriver) {}
  async initialize() {
    if (this.ready) { this.voices = this.driver.voices(); return; }
    if (this.initialization) return this.initialization;
    this.initialization = (async () => {
      this.state = 'loading'; this.hooks.change();
      try {
        await this.driver.init({maxTimeout: 5000, interval: 250});
        this.voices = this.driver.voices();
        if (!this.voices.length) throw Error('No speech voices are available on this device.');
        this.ready = true; this.state = 'idle'; this.hooks.change();
      } catch (error) { this.state = 'error'; this.hooks.change(); throw error; }
    })();
    try { await this.initialization; } finally { this.initialization = null; }
  }
  async play(chapters: {text: string}[], position: SpeechPosition, options: {language: string; rate: number; voiceURI?: string}) {
    this.stop(); const token = this.generation;
    await this.initialize();
    if (token !== this.generation) return;
    this.chapters = chapters;
    this.position = {...position}; this.language = options.language;
    this.rate = Math.min(2, Math.max(.5, options.rate));
    this.voice = this.voices.find(v => v.voiceURI === options.voiceURI) || this.voices.find(v => v.lang.toLowerCase().startsWith(options.language.split('-')[0].toLowerCase()));
    if (!this.voice) throw Error('No voice is installed for this language. Choose an available voice.');
    this.makeQueue(); this.state = 'playing'; this.hooks.change();
    void this.pump(token);
  }
  private makeQueue() {
    const text = this.chapters[this.position.chapterIndex]?.text || '';
    const offset = Math.max(0, Math.min(text.length, this.position.charOffset));
    this.queue = sentences(text.slice(offset), this.language).map(s => ({...s, start: s.start + offset, end: s.end + offset}));
    this.cursor = 0;
  }
  private async pump(token: number) {
    if (token !== this.generation || this.state !== 'playing') return;
    if (this.cursor >= this.queue.length) {
      if (this.position.chapterIndex + 1 >= this.chapters.length) { this.state = 'idle'; this.hooks.change(); return; }
      this.position = {chapterIndex: this.position.chapterIndex + 1, charOffset: 0}; this.makeQueue();
      if (!this.queue.length) { void this.pump(token); return; }
    }
    const sentence = this.queue[this.cursor];
    this.position.charOffset = sentence.start;
    this.hooks.sentence({...this.position}, sentence.end);
    try {
      await this.driver.speak({text: sentence.text, voice: this.voice, rate: this.rate, boundary: event => {
        if (token !== this.generation || this.state !== 'playing' || event.name !== 'word' || event.charIndex === undefined) return;
        const start = sentence.start + event.charIndex;
        const tail = sentence.text.slice(event.charIndex);
        const length = event.charLength || tail.match(/^[\p{L}\p{N}]+/u)?.[0].length || 1;
        this.position.charOffset = start;
        this.hooks.word({...this.position}, Math.min(sentence.end, start + length));
      }});
      if (token !== this.generation) return;
      this.cursor++;
      if (this.queue[this.cursor]) this.position.charOffset = this.queue[this.cursor].start;
      else this.position.charOffset = sentence.end;
      if (this.state === 'playing') void this.pump(token);
    } catch (error) {
      if (token !== this.generation) return;
      this.state = 'error'; this.hooks.change(); this.hooks.error(error instanceof Error ? error.message : 'Read aloud failed.');
    }
  }
  setRate(rate: number) {
    this.rate = Math.min(2, Math.max(.5, Number.isFinite(rate) ? rate : 1));
    if (this.state === 'playing') { this.pause(); this.resume(); }
  }
  pause() { if (this.state !== 'playing') return; this.generation++; this.state = 'paused'; this.driver.pause(); this.driver.cancel(); this.hooks.change(); }
  resume() { if (this.state !== 'paused') return; this.state = 'playing'; this.makeQueue(); this.driver.resume(); this.hooks.change(); void this.pump(this.generation); }
  stop() { this.generation++; if (this.ready) this.driver.cancel(); this.state = 'idle'; this.hooks.change(); }
}
