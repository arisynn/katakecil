import React,{useEffect,useRef,useState} from 'react';
import {Cover as PublicCover,type CoverProps} from '../../components/Cover';
import type {Book} from '../../data/library';
import {downloadCover} from './api';
/** Private thumbnails live only in component memory; no signed URL or browser persistence. */
export function Cover(props:CoverProps&{book:Book}){
 const node=useRef<HTMLDivElement|null>(null),[visible,setVisible]=useState(false),[url,setURL]=useState('');
 useEffect(()=>{if(!node.current)return;if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'120px'});observer.observe(node.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{setURL('');if(!visible||!props.book.studio_cover_path)return;let active=true,local='';void downloadCover(props.book.studio_cover_path).then(blob=>{if(active){local=URL.createObjectURL(blob);setURL(local);}}).catch(()=>{});return()=>{active=false;if(local)URL.revokeObjectURL(local);};},[visible,props.book.studio_cover_path]);
 return <div ref={node} className={`kk-author-cover kk-author-cover--${props.size||'normal'}`}><PublicCover {...props} book={url?{...props.book,cover_url:url,cover_manifest:null}:props.book}/></div>;
}
