export const DEFAULTS = { glassBlur:20, glassOpacity:.68, themeMode:'light', ambientLuxThreshold:45, lux:250, fontFamily:'Lora', fontSize:19, lineHeight:1.8, margin:52, spreadMode:'single', pageAnimation:'slide', accentColor:'#54756c', uiLanguage:'en' };
const safeRead = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
export let storageHealthy = true;
export function writeLocal(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { storageHealthy = false; return false; } }
let settings = safeRead('lumina_device_settings', {});
export const deviceId = settings.deviceId || crypto.randomUUID();
export let preferences = { ...DEFAULTS, ...settings, deviceId };
if(preferences.schemaVersion!==2){preferences={...preferences,schemaVersion:2,spreadMode:'single',themeMode:preferences.themeMode==='auto-sensor'?'system':preferences.themeMode};}
if(!/^#[0-9a-f]{6}$/i.test(preferences.accentColor))preferences.accentColor=DEFAULTS.accentColor;
// Upgrade the previous automatic Indonesian default once; later user choices remain explicit.
if(!settings.uiLanguageChosen&&settings.uiLanguageDefaultVersion!==1)preferences.uiLanguage='en';
preferences.uiLanguageDefaultVersion=1;
if(!['id','en'].includes(preferences.uiLanguage))preferences.uiLanguage='en';
writeLocal('lumina_device_settings', preferences);
let database;
export async function openDatabase() {
  if (database) return database;
  database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('lumina-reader', 1);
    request.onupgradeneeded = () => { const db = request.result; ['books','progress','annotations'].forEach(name => { if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, {keyPath:'id'}); }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(() => { storageHealthy = false; return null; });
  return database;
}
export async function dbPut(store, value) {
  const db = await openDatabase();
  if (!db) return false;
  return new Promise(resolve => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(value); tx.oncomplete = () => resolve(true); tx.onerror = () => { storageHealthy = false; resolve(false); }; tx.onabort = () => { storageHealthy = false; resolve(false); }; });
}
export async function dbGetAll(store) {
  const db = await openDatabase();
  if (!db) return [];
  return new Promise(resolve => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => resolve([]); });
}
export async function dbDelete(store, id) {
  const db = await openDatabase(); if (!db) return;
  return new Promise(resolve => { const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>resolve(); });
}
export let progress = safeRead('lumina_reading_progress', {});
export let annotations = safeRead('lumina_annotations', []);
let broadcast;
try { broadcast = new BroadcastChannel('lumina-local-sync'); } catch { /* The storage event provides a fallback. */ }
const callbacks = new Set();
export const onSync = (callback) => callbacks.add(callback);
function receive({kind, payload}) {
  if (kind === 'preferences') preferences = payload;
  if (kind === 'progress') progress = {...progress, [payload.bookId]:payload};
  if (kind === 'annotation') annotations = [...annotations.filter(a => a.id !== payload.id), payload];
  if (kind === 'delete-annotation') annotations = annotations.filter(a => a.id !== payload);
  callbacks.forEach(cb => cb(kind, payload));
}
if (broadcast) broadcast.onmessage = event => receive(event.data);
window.addEventListener('storage', event => {
  if (event.key === 'lumina_device_settings' && event.newValue) receive({kind:'preferences',payload:safeRead(event.key, preferences)});
  if (event.key === 'lumina_reading_progress') { progress = safeRead(event.key, {}); callbacks.forEach(cb=>cb('progress',null)); }
  if (event.key === 'lumina_annotations') { annotations = safeRead(event.key, []); callbacks.forEach(cb=>cb('annotations',null)); }
});
function emit(kind,payload) { try { broadcast?.postMessage({kind,payload}); } catch {} }
export function updatePreferences(change) { preferences={...preferences,...change};writeLocal('lumina_device_settings',preferences);emit('preferences',preferences); }
export function saveProgress(value) {
  const record={...value,id:value.bookId,updatedAt:new Date().toISOString()};
  const fresh=safeRead('lumina_reading_progress',progress);
  progress={...fresh,[value.bookId]:record};
  writeLocal('lumina_reading_progress',progress);dbPut('progress',record);emit('progress',record);
}
export function saveAnnotation(value) {
  const fresh=safeRead('lumina_annotations',annotations);
  annotations=[...fresh.filter(a=>a.id!==value.id),value];
  const saved=writeLocal('lumina_annotations',annotations);dbPut('annotations',value);emit('annotation',value);return saved;
}
export function deleteAnnotation(id) { annotations=safeRead('lumina_annotations',annotations).filter(a=>a.id!==id);writeLocal('lumina_annotations',annotations);dbDelete('annotations',id);emit('delete-annotation',id); }
export async function hydrate() {
  const [storedProgress,storedAnnotations]=await Promise.all([dbGetAll('progress'),dbGetAll('annotations')]);
  for (const record of storedProgress) if (!progress[record.bookId] || progress[record.bookId].updatedAt < record.updatedAt) progress[record.bookId]=record;
  // LocalStorage is authoritative after deletions; IDB is a recovery copy when that key is absent.
  if (localStorage.getItem('lumina_annotations') === null) annotations=storedAnnotations;
}
