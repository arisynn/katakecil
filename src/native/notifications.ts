import {registerPlugin,type PluginListenerHandle} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {navigate} from '../utils/nav';

type Settings={chapters:boolean;reminder:boolean;time:string;lastChecked:number;allowed:boolean};
const ChapterAlerts=registerPlugin<{
 getSettings():Promise<Settings>;
 configure(options:{enabled:boolean;url?:string;key?:string}):Promise<void>;
 saveReminder(options:{enabled:boolean;time:string}):Promise<void>;
 consumeRoute():Promise<{route:string}>;
 addListener(event:'routeRequested',handler:(value:{route:string})=>void):Promise<PluginListenerHandle>;
}>('ChapterAlerts');
const REMINDER_ID=41021;
export const getNotificationSettings=()=>ChapterAlerts.getSettings();
async function permission(){
 const state=await LocalNotifications.checkPermissions();
 const allowed=state.display==='granted'?state:await LocalNotifications.requestPermissions();
 if(allowed.display!=='granted')throw Error('Izin notifikasi belum diberikan. Kamu bisa mengaktifkannya di pengaturan aplikasi Android.');
}
export async function saveReminder(enabled:boolean,time:string){
 if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Pilih waktu pengingat yang valid.');
 if(enabled){
  await permission();
  await LocalNotifications.createChannel({id:'katakecil_reading',name:'Waktu membaca',importance:3});
  const [hour,minute]=time.split(':').map(Number);
  // Inexact by design: no exact-alarm access or idle/battery exemption prompt.
  await LocalNotifications.schedule({notifications:[{id:REMINDER_ID,title:'Ada waktu untuk satu halaman?',body:'Kembali ke ceritamu di KataKecil.',channelId:'katakecil_reading',smallIcon:'ic_stat_book',isExactNotification:false,schedule:{on:{hour,minute},repeats:true},extra:{route:'/'}}]});
 }else await LocalNotifications.cancel({notifications:[{id:REMINDER_ID}]});
 await ChapterAlerts.saveReminder({enabled,time});
}
export async function setChapterAlerts(enabled:boolean){
 if(enabled)await permission();
 await ChapterAlerts.configure({enabled,...(enabled?{url:import.meta.env.VITE_SUPABASE_URL?.trim(),key:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()}: {})});
}
export async function sendTestNotification(){
 await permission();
 await LocalNotifications.createChannel({id:'katakecil_reading',name:'Waktu membaca',importance:3});
 await LocalNotifications.schedule({notifications:[{id:41022,title:'Halo dari KataKecil',body:'Notifikasi di perangkat ini sudah bisa ditampilkan.',channelId:'katakecil_reading',smallIcon:'ic_stat_book',isExactNotification:false,extra:{route:'/'}}]});
}
function openRoute(route:string){if(route==='/'||/^\/baca\/[A-Za-z0-9%_-]+(?:\?episode=\d{1,4})?$/.test(route))navigate(route);}
export async function consumeNotificationRoute(){const result=await ChapterAlerts.consumeRoute();if(result?.route)openRoute(result.route);}
export async function installNotificationRouting(){
 await ChapterAlerts.addListener('routeRequested',value=>openRoute(value.route));
 await LocalNotifications.addListener('localNotificationActionPerformed',event=>openRoute(event.notification.extra?.route||'/'));
 await consumeNotificationRoute();
}
