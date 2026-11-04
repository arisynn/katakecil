import {Capacitor, registerPlugin, SystemBars as Bars, SystemBarsStyle, type PluginListenerHandle} from '@capacitor/core';
import {App} from '@capacitor/app';
import type {SpeechDriver, SpeechBoundary} from '../reader/speech';
export {installBackNavigation} from './navigation';
interface AppUpdate { version: string; tag: string; size: number; notes: string; preview: boolean }
interface UpdatePlugin {
  check(): Promise<{currentVersion: string; versionCode: number; previewChannel: boolean; update: AppUpdate | null}>;
  download(): Promise<{ready: boolean}>;
  install(): Promise<{permissionRequired: boolean}>;
  cancel(): Promise<void>;
  addListener(name: 'downloadProgress', listener: (event: {percent: number; received: number; total: number}) => void): Promise<PluginListenerHandle>;
}
export const nativeUpdates = registerPlugin<UpdatePlugin>('KataKecilUpdates');

interface Voice { name: string; lang: string; localService: boolean }
interface DevicePlugin {
  saveJson(options: {filename: string; text: string}): Promise<{saved: boolean}>;
  initializeSpeech(): Promise<{voices: Voice[]}>;
  speak(options: {text: string; voice: string; rate: number; utteranceId: string}): Promise<void>;
  stopSpeech(): Promise<void>;
  addListener(name: 'speechProgress', listener: (event: {utteranceId: string; start?: boolean; charIndex?: number; charLength?: number}) => void): Promise<PluginListenerHandle>;
  addListener(name: 'activityChange', listener: (event: {active: boolean}) => void): Promise<PluginListenerHandle>;
  setKeepAwake(options: {enabled: boolean}): Promise<void>;
  setOrientation(options: {orientation: string}): Promise<void>;
}
const Device = registerPlugin<DevicePlugin>('KataKecilDevice');
export const isNativeApp = Capacitor.isNativePlatform();
let fullscreen = false;
export const nativeFullscreen = () => fullscreen;
export async function toggleNativeFullscreen() {
  if (!isNativeApp) return;
  if (fullscreen) await Bars.show(); else await Bars.hide();
  fullscreen = !fullscreen;
  window.dispatchEvent(new Event('resize'));
}
export async function resetNativeScreen() {
  if (!isNativeApp) return;
  await Promise.all([Device.setOrientation({orientation: 'auto'}), Bars.show()]);
  fullscreen = false;
}
export async function updateSystemTheme(dark: boolean) {
  if (isNativeApp) await Bars.setStyle({style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light});
}
export async function setReaderOrientation(orientation: string) {
  if (isNativeApp) { await Device.setOrientation({orientation}); return; }
  const api = screen.orientation as ScreenOrientation & {lock?: (value: string) => Promise<void>};
  if (orientation === 'auto') api?.unlock?.();
  else if (api?.lock) await api.lock(orientation);
  else throw Error('Orientation lock is unavailable. Rotate your device manually.');
}
export async function saveJSON(filename: string, text: string): Promise<boolean> {
  if (isNativeApp) return (await Device.saveJson({filename, text})).saved;
  const file = new File([text], filename, {type: 'application/json'});
  // Share is initiated directly by the export button; cancellation creates no false success.
  if (navigator.canShare?.({files: [file]}) && navigator.share) {
    try { await navigator.share({files: [file]}); return true; }
    catch (error) { if ((error as Error).name === 'AbortError') return false; throw error; }
  }
  const url = URL.createObjectURL(file), link = document.createElement('a');
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return true;
}
export function createNativeWakeLock() {
  if (!isNativeApp) return undefined;
  let enabled = false;
  return {get active() {return enabled;}, async set(value: boolean) {
    await Device.setKeepAwake({enabled: value}); enabled = value;
  }};
}
class AndroidSpeechDriver implements SpeechDriver {
  private available: SpeechSynthesisVoice[] = [];
  private callbacks = new Map<string, {start: () => void; boundary: (event: SpeechBoundary) => void}>();
  private listener: Promise<PluginListenerHandle> | undefined;
  private sequence = 0;
  async init() {
    this.listener ??= Device.addListener('speechProgress', event => {
      const callback = this.callbacks.get(event.utteranceId); if (!callback) return;
      if (event.start) callback.start();
      if (event.charIndex !== undefined) callback.boundary({name: 'word', charIndex: event.charIndex, charLength: event.charLength});
    });
    await this.listener;
    const result = await Device.initializeSpeech();
    this.available = result.voices.map((voice, index) => ({...voice, voiceURI: voice.name, default: index === 0}));
  }
  voices() { return this.available; }
  async speak(options: Parameters<SpeechDriver['speak']>[0]) {
    const utteranceId = 'kk-' + ++this.sequence;
    this.callbacks.set(utteranceId, options);
    try { await Device.speak({text: options.text, voice: options.voice?.voiceURI || '', rate: options.rate, utteranceId}); }
    finally { this.callbacks.delete(utteranceId); }
  }
  pause() { /* ReadAloud cancels the utterance and resumes from its last word. */ }
  resume() {}
  cancel() { this.callbacks.clear(); void Device.stopSpeech().catch(() => {}); }
}
export const nativeSpeechDriver: SpeechDriver | undefined = isNativeApp ? new AndroidSpeechDriver() : undefined;
export async function listenNativeLifecycle(handlers: {back: () => boolean; active: (value: boolean) => void}) {
  if (!isNativeApp) return;
  await Device.addListener('activityChange', ({active}) => handlers.active(active));
  await App.addListener('backButton', () => { if (!handlers.back()) void App.exitApp(); });
  await App.addListener('appStateChange', ({isActive}) => handlers.active(isActive));
}
