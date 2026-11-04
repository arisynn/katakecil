import EasySpeech from 'easy-speech';
export interface SpeechPosition { chapterIndex: number; charOffset: number }
export interface SpeechBoundary { charIndex?: number; charLength?: number; name?: string }
export interface SpeechDriver {
  init(options?: {maxTimeout: number; interval: number}): Promise<unknown>;
  voices(): SpeechSynthesisVoice[];
  speak(options: {text: string; voice?: SpeechSynthesisVoice; rate: number; start: () => void; boundary: (event: SpeechBoundary) => void}): Promise<unknown>;
  pause(): void; resume(): void; cancel(): void;
}
type Chunk = {text: string; start: number; end: number; paragraphStart: number; paragraphEnd: number};
export class ReadAloud {
  state: 'idle' | 'loading' | 'playing' | 'paused' | 'error' = 'idle';
  tracking = 'paragraph' as const;
  position: SpeechPosition = {chapterIndex:0,charOffset:0};
  voices: SpeechSynthesisVoice[] = [];
  private ready = false;
  private initialization: Promise<void> | null = null;
  private generation = 0;
  private queue: Chunk[] = [];
  private cursor = 0;
  private chapters: {text:string}[] = [];
  private language = 'en';
  private rate = 1;
  private voice?: SpeechSynthesisVoice;
  constructor(private hooks: {
    change: () => void;
    paragraph: (position: SpeechPosition,end: number) => void;
    position?: (position: SpeechPosition) => void;
    error: (message: string) => void;
  }, private driver: SpeechDriver = EasySpeech as unknown as SpeechDriver) {}
  async initialize() {
    if (this.ready) { this.voices=this.driver.voices();return; }
    if (this.initialization) return this.initialization;
    this.initialization=(async()=>{
      this.state='loading';this.hooks.change();
      try {
        await this.driver.init({maxTimeout:5000,interval:250});
        this.voices=this.driver.voices();
        if (!this.voices.length) throw Error('No speech voices are available on this device.');
        this.ready=true;this.state='idle';this.hooks.change();
      } catch(error) {this.state='error';this.hooks.change();throw error;}
    })();
    try {await this.initialization;} finally {this.initialization=null;}
  }
  async play(chapters: {text:string}[], position: SpeechPosition, options: {language:string;rate:number;voiceURI?:string}) {
    this.stop();const token=this.generation;
    await this.initialize();if (token!==this.generation) return;
    this.chapters=chapters;this.position={...position};this.language=options.language;
    this.rate=Math.min(2,Math.max(.5,Number.isFinite(options.rate)?options.rate:1));
    const matching=this.voices.filter(v=>v.lang.toLowerCase().startsWith(options.language.split('-')[0].toLowerCase()));
    this.voice=this.voices.find(v=>v.voiceURI===options.voiceURI)||matching.find(v=>v.localService)||matching[0];
    if (!this.voice) throw Error('No voice is installed for this language. Choose an available voice.');
    this.makeQueue();this.state='playing';this.hooks.change();void this.pump(token);
  }
  private makeQueue() {
    const text=this.chapters[this.position.chapterIndex]?.text||'',offset=Math.max(0,Math.min(text.length,this.position.charOffset));
    this.queue=[];this.cursor=0;
    const add=(from:number,to:number)=>{
      while(from<to&&/\s/.test(text[from]))from++;
      while(to>from&&/\s/.test(text[to-1]))to--;
      if(to<=offset||to<=from)return;
      let start=Math.max(from,offset);
      while(start<to){
        // Android accepts at most 4,000 UTF-16 units. Only unusually long paragraphs split;
        // all chunks retain the same complete paragraph highlight.
        let end=Math.min(to,start+4000);
        if(end<to){const space=text.lastIndexOf(' ',end-1);if(space>start+2000)end=space+1;const code=text.charCodeAt(end-1);if(code>=0xD800&&code<=0xDBFF)end--;}
        this.queue.push({text:text.slice(start,end),start,end,paragraphStart:from,paragraphEnd:to});start=end;
      }
    };
    let start=0;for(const match of text.matchAll(/\r?\n[ \t]*\r?\n+/g)){add(start,match.index!);start=match.index!+match[0].length;}add(start,text.length);
  }
  private async pump(token:number) {
    if (token!==this.generation||this.state!=='playing') return;
    if (this.cursor>=this.queue.length) {
      if (this.position.chapterIndex+1>=this.chapters.length) {this.state='idle';this.hooks.change();return;}
      this.position={chapterIndex:this.position.chapterIndex+1,charOffset:0};this.makeQueue();
      if (!this.queue.length) {void this.pump(token);return;}
    }
    const chunk=this.queue[this.cursor];
    this.position.charOffset=chunk.start;
    this.hooks.paragraph({chapterIndex:this.position.chapterIndex,charOffset:chunk.paragraphStart},chunk.paragraphEnd);
    this.hooks.position?.({...this.position});
    try {
      await this.driver.speak({text:chunk.text,voice:this.voice,rate:this.rate,start:()=>{
        if (token!==this.generation||this.state!=='playing') return;
        this.hooks.position?.({...this.position});
      },boundary:event=>{
        if (token!==this.generation||this.state!=='playing'||event.name!=='word'||event.charIndex===undefined||event.charIndex<0||event.charIndex>=chunk.text.length) return;
        this.position.charOffset=chunk.start+event.charIndex;this.hooks.position?.({...this.position});
      }});
      if (token!==this.generation) return;
      this.position.charOffset=chunk.end;this.cursor++;
      if (this.state==='playing') void this.pump(token);
    } catch(error) {
      if (token!==this.generation) return;
      this.state='error';this.hooks.change();this.hooks.error(error instanceof Error?error.message:'Read aloud failed.');
    }
  }
  setRate(rate:number) {this.rate=Math.min(2,Math.max(.5,Number.isFinite(rate)?rate:1));if(this.state==='playing'){this.pause();this.resume();}}
  pause() {if(this.state!=='playing')return;this.generation++;this.state='paused';this.driver.pause();this.driver.cancel();this.hooks.change();}
  resume() {if(this.state!=='paused')return;this.state='playing';this.makeQueue();this.driver.resume();this.hooks.change();void this.pump(this.generation);}
  stop() {this.generation++;if(this.ready)this.driver.cancel();this.state='idle';this.hooks.change();}
}
