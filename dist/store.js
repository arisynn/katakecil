import {readerDefaults,migrateReaderPreferences} from './advanced-reader.js?v=16';
import {GLASS_DEFAULTS,normalizeGlassPreferences} from './glass-preferences.js?v=1';
export const DEFAULTS = { ...readerDefaults, ...GLASS_DEFAULTS, glassOpacity:.68, themeMode:'light', ambientLuxThreshold:45, lux:250, fontFamily:'Lora', fontSize:19, lineHeight:1.6, margin:52, spreadMode:'single', pageAnimation:'fade', accentColor:'#54756c', uiLanguage:'en' };
const safeRead = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
export let storageHealthy = true;
export function writeLocal(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { storageHealthy = false; return false; } }
let settings = safeRead('lumina_device_settings', {});
export const deviceId = settings.deviceId || crypto.randomUUID();
export let preferences = { ...DEFAULTS, ...settings, ...migrateReaderPreferences(settings), deviceId };
preferences={...preferences,...normalizeGlassPreferences(preferences)};
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
  return new Promise(resolve => { try { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(value); tx.oncomplete = () => resolve(true); tx.onerror = () => { storageHealthy = false; resolve(false); }; tx.onabort = () => { storageHealthy = false; resolve(false); }; } catch { storageHealthy=false;resolve(false); } });
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
// Local book management leaves progress/annotations intact for a later re-import.
async function changeLocalBook(id,change){
 const db=await openDatabase();if(!db)return false;
 return new Promise(resolve=>{try{
  const tx=db.transaction('books','readwrite'),store=tx.objectStore('books'),request=store.get(id);let result=false;
  request.onsuccess=()=>{const book=request.result;if(book?.source!=='local'){tx.abort();return;}result=change(book);if(result)store.put(result);else store.delete(id);};
  tx.oncomplete=()=>resolve(result||true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false);
 }catch{resolve(false);}});
}
export const deleteLocalBook=id=>changeLocalBook(id,()=>null);
export function setLocalBookCover(id,cover,custom=true){
 if(typeof cover!=='string'||!cover.startsWith('data:image/')||cover.length>5*1024*1024)return Promise.resolve(false);
 return changeLocalBook(id,book=>({...book,cover,coverChecked:true,coverCustom:custom}));
}
export let progress = safeRead('lumina_reading_progress', {});
export let annotations = safeRead('lumina_annotations', []);
const removedAnnotations=new Set();
const annotationTime=a=>a?.updatedAt||a?.createdAt||'';
function mergeAnnotations(...collections){const merged=new Map();for(const records of collections)for(const record of records){const old=merged.get(record.id);if(!removedAnnotations.has(record.id)&&(!old||annotationTime(record)>=annotationTime(old)))merged.set(record.id,record);}return [...merged.values()];}
let broadcast;
try { broadcast = new BroadcastChannel('lumina-local-sync'); } catch { /* The storage event provides a fallback. */ }
const callbacks = new Set();
export const onSync = (callback) => callbacks.add(callback);
function receive({kind, payload}) {
  if (kind === 'preferences') preferences = {...payload,...normalizeGlassPreferences(payload)};
  if (kind === 'progress') progress = {...progress, [payload.bookId]:payload};
  if (kind === 'annotation') {removedAnnotations.delete(payload.id);annotations=mergeAnnotations(annotations,[payload]);}
  if (kind === 'delete-annotation') {removedAnnotations.add(payload);annotations = annotations.filter(a => a.id !== payload);}
  callbacks.forEach(cb => cb(kind, payload));
}
if (broadcast) broadcast.onmessage = event => receive(event.data);
window.addEventListener('storage', event => {
  if (event.key === 'lumina_device_settings' && event.newValue) receive({kind:'preferences',payload:safeRead(event.key, preferences)});
  if (event.key === 'lumina_reading_progress') { progress = safeRead(event.key, {}); callbacks.forEach(cb=>cb('progress',null)); }
  if (event.key === 'lumina_annotations') { annotations = safeRead(event.key, []); callbacks.forEach(cb=>cb('annotations',null)); }
});
function storageFailure(){window.dispatchEvent(new window.CustomEvent('katakecil-storage-failure'));}
function emit(kind,payload) { try { broadcast?.postMessage({kind,payload}); } catch {} }
export function updatePreferences(change) { preferences={...preferences,...change,...normalizeGlassPreferences({...preferences,...change})};writeLocal('lumina_device_settings',preferences);emit('preferences',preferences); }
// Only controls exposed by the Text and Layout reader tabs belong to comfort reset.
export function resetReadingPreferences(){
 const keys=['fontFamily','fontSize','fontWeight','lineHeight','paragraphSpacing','letterSpacing','paragraphIndent','textAlign','readingMode','spreadMode','pageAnimation','contentPosition','marginHorizontal','marginVertical','readerWidth','brightness','orientation','tapNavigation','wakeLock'];
 const next={...preferences,...Object.fromEntries(keys.map(key=>[key,DEFAULTS[key]]))};
 if(!writeLocal('lumina_device_settings',next)){storageFailure();throw Error('Settings could not be saved. Please try again.');}
 preferences=next;emit('preferences',preferences);return preferences;
}

export function saveProgress(value) {
  const record={...progress[value.bookId],...value,id:value.bookId,updatedAt:new Date().toISOString()};
  const fresh=safeRead('lumina_reading_progress',progress);
  progress={...fresh,[value.bookId]:record};
  const saved=writeLocal('lumina_reading_progress',progress);dbPut('progress',record).then(ok=>{if(!saved&&!ok)storageFailure();});emit('progress',record);
}
export function saveAnnotation(value) {
  const fresh=safeRead('lumina_annotations',[]),previous=annotations.find(a=>a.id===value.id);removedAnnotations.delete(value.id);
  const record={...value,updatedAt:new Date(Math.max(Date.now(),Date.parse(previous?.updatedAt||'')+1||0)).toISOString()};
  annotations=[...mergeAnnotations(fresh,annotations).filter(a=>a.id!==value.id),record];
  const saved=writeLocal('lumina_annotations',annotations);dbPut('annotations',record).then(ok=>{if(!saved&&!ok)storageFailure();});emit('annotation',record);return saved;
}
export function deleteAnnotation(id) {
 const existing=annotations.find(a=>a.id===id);removedAnnotations.add(id);annotations=annotations.filter(a=>a.id!==id);const saved=writeLocal('lumina_annotations',annotations);
 // A metadata-only tombstone prevents a failed LocalStorage mirror from resurrecting deleted notes.
 dbPut('annotations',{id,bookId:existing?.bookId,deleted:true,updatedAt:new Date(Math.max(Date.now(),Date.parse(existing?.updatedAt||'')+1||0)).toISOString()}).then(ok=>{if(!saved&&!ok)storageFailure();});emit('delete-annotation',id);
}
export async function hydrate() {
  const [storedProgress,storedAnnotations]=await Promise.all([dbGetAll('progress'),dbGetAll('annotations')]);
  for (const record of storedProgress) if (!progress[record.bookId] || progress[record.bookId].updatedAt < record.updatedAt) progress[record.bookId]=record;
  const merged=new Map(annotations.map(a=>[a.id,a]));
  const timestamp=a=>a?.updatedAt||a?.createdAt||'';
  for(const record of storedAnnotations){const local=merged.get(record.id);if(record.deleted){if(!local||timestamp(record)>=timestamp(local)){merged.delete(record.id);removedAnnotations.add(record.id);}}else if(!local||timestamp(record)>timestamp(local))merged.set(record.id,record);}
  annotations=[...merged.values()];writeLocal('lumina_annotations',annotations);
}

// A single IndexedDB transaction commits imported reading metadata. Existing newer records
// and deletion tombstones win; the current device identity is never imported.
export async function restoreBackup(backup,{restorePreferences=false}={}) {
 await hydrate();
 const stored=await dbGetAll('annotations'),byId=new Map(annotations.map(a=>[a.id,a]));
 const deleted=new Map(stored.filter(a=>a.deleted).map(a=>[a.id,a]));
 const nextProgress={...progress},writes=[],progressWrites=[];let skipped=0;
 for(const incoming of backup.annotations){
  const old=byId.get(incoming.id),tombstone=deleted.get(incoming.id);
  if(old&&old.bookId!==incoming.bookId)throw Error('A note ID belongs to another book. Nothing was imported.');
  if(tombstone&&annotationTime(tombstone)>=annotationTime(incoming)||old&&annotationTime(old)>=annotationTime(incoming)){skipped++;continue;}
  const copy={...incoming};byId.set(copy.id,copy);writes.push(copy);
 }
 for(const incoming of backup.progress){
  const old=nextProgress[incoming.bookId];if(old&&annotationTime(old)>=annotationTime(incoming)){skipped++;continue;}
  const copy={...incoming,id:incoming.bookId};nextProgress[incoming.bookId]=copy;progressWrites.push(copy);
 }
 const nextAnnotations=[...byId.values()],db=await openDatabase();let durable=false;
 if(db)durable=await new Promise(resolve=>{try{
  const tx=db.transaction(['progress','annotations'],'readwrite');
  for(const row of writes)tx.objectStore('annotations').put(row);
  for(const row of progressWrites)tx.objectStore('progress').put(row);
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false);
 }catch{resolve(false);}});
 const localProgress=writeLocal('lumina_reading_progress',nextProgress),localAnnotations=writeLocal('lumina_annotations',nextAnnotations);
 if(!durable&&(!localProgress||!localAnnotations)){storageFailure();throw Error('Storage is unavailable. Keep your backup and try again.');}
 progress=nextProgress;annotations=nextAnnotations;
 for(const row of writes){removedAnnotations.delete(row.id);emit('annotation',row);}
 for(const row of progressWrites)emit('progress',row);
 if(restorePreferences){
  const merged={...preferences,...backup.preferences},next={...merged,...normalizeGlassPreferences(merged),deviceId};
  if(!writeLocal('lumina_device_settings',next))throw Error('Reading data was imported, but settings could not be saved.');
  preferences=next;emit('preferences',preferences);
 }
 return {annotations:writes.length,progress:progressWrites.length,skipped};
}

export async function flush() {
 const results=await Promise.all([
  ...Object.values(progress).map(row=>dbPut('progress',{...row,id:row.bookId})),
  ...annotations.map(row=>dbPut('annotations',row)),
 ]);
 return results.every(Boolean);
}
