import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBackup,parseBackup,BACKUP_MAX_BYTES} from '../dist/device-backup.js';
const timestamp='2026-11-04T08:00:00.000Z';
const note={id:'note-1',bookId:'book-one',type:'highlight',color:'amber',chapterIndex:0,startOffset:2,endOffset:7,charOffset:2,selectedText:'quiet',noteText:'A note',createdAt:timestamp,updatedAt:timestamp,anchor:{episodeId:'chapter.xhtml',exact:'quiet',prefix:'A ',suffix:' room',start:2,end:7}};
const input=()=>({preferences:{deviceId:'old-device',fontSize:21,uiLanguage:'id',themeMode:'sepia',accentColor:'#54756c'},progress:{'book-one':{bookId:'book-one',chapterIndex:0,charOffset:2,percentage:25,updatedAt:timestamp}},annotations:[note]});
test('backup roundtrip preserves reading anchors and omits device identity and manuscript fields',()=>{
 const data=input();data.annotations[0]={...note,epubBuffer:'private',chapters:[{text:'manuscript'}]};
 const backup=createBackup(data),raw=JSON.stringify(backup),restored=parseBackup(raw);
 assert.equal(restored.preferences.fontSize,21);assert.equal(restored.preferences.deviceId,undefined);
 assert.equal(restored.annotations[0].anchor.exact,'quiet');assert.equal(restored.progress[0].percentage,25);
 assert.equal(raw.includes('manuscript'),false);assert.equal(raw.includes('private'),false);assert.equal(raw.includes('epubBuffer'),false);
});
test('legacy device-wide and book-specific exports import annotations without changing settings',()=>{
 for(const extra of [{exportedAt:timestamp,deviceId:'legacy'},{schemaVersion:1,bookId:'book-one'}]){
  const result=parseBackup(JSON.stringify({...extra,annotations:[note]}));
  assert.equal(result.schemaVersion,1);assert.equal(result.annotations.length,1);assert.deepEqual(result.preferences,{});assert.deepEqual(result.progress,[]);
 }
});
test('invalid backups reject completely before restoring, including future versions, duplicates and prototype keys',()=>{
 const good=createBackup(input());
 for(const value of [null,{},[],{...good,schemaVersion:99},{...good,annotations:[note,note]},{...good,annotations:[{...note,bookId:'__proto__'}]},{...good,annotations:[{...note,anchor:{...note.anchor,end:1}}]},{...good,annotations:[{...note,noteText:'x'.repeat(10001)}]},{...good,preferences:{fontSize:'large'}},{...good,preferences:{themeMode:'<script>'}},{...good,progress:[{bookId:'book-one',chapterIndex:0,percentage:101}]}])assert.throws(()=>parseBackup(JSON.stringify(value)),/Invalid/);
 assert.throws(()=>parseBackup('{broken'),/Invalid/);
 assert.throws(()=>parseBackup(' '.repeat(BACKUP_MAX_BYTES+1)),/8 MB/);
});
