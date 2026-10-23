import type {ReaderBlock,ReaderInline} from '../../types/reader';

const blockTags=new Set('p div section article main h1 h2 h3 h4 h5 h6 blockquote pre ul ol li dl dt dd table thead tbody tfoot tr th td figure figcaption hr'.split(' '));
const blocked=new Set('script style iframe object embed form input button svg math audio video head link meta base'.split(' '));
const imageOkay=(src:string,allowBlob:boolean)=>/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src)||(allowBlob&&src.startsWith('blob:'+location.origin+'/'));
/** Rebuild typed React content; never inject EPUB markup, scripts, publisher CSS,
 * remote images or arbitrary attributes into the shared reader. */
export function epubReaderContent(html:string,allowBlob=false){
 const document=new DOMParser().parseFromString(html,'text/html'),blocks:ReaderBlock[]=[],anchorBlocks=new Map<string,number>();
 let buffer:ReaderInline[]=[],kind:ReaderBlock['kind']='text';
 const flush=()=>{
  const nodes=buffer;buffer=[];
  if(nodes.length){nodes[0]={...nodes[0],text:nodes[0].text.trimStart()};nodes[nodes.length-1]={...nodes.at(-1)!,text:nodes.at(-1)!.text.trimEnd()};}
  const text=nodes.map(node=>node.text).join('');if(text.trim())blocks.push({kind,nodes,text});
 };
 const visit=(node:Node,style:Omit<ReaderInline,'text'>={})=>{
  if(node.nodeType===3){buffer.push({...style,text:kind==='pre'?(node.nodeValue||''):(node.nodeValue||'').replace(/\s+/g,' ')});return;}
  if(node.nodeType!==1)return;const element=node as Element,tag=element.localName.toLowerCase();if(blocked.has(tag))return;
  const boundary=blockTags.has(tag),previous=kind;if(boundary){flush();kind=/^h[1-6]$/.test(tag)?'heading':tag==='blockquote'?'quote':tag==='pre'?'pre':previous;}
  const id=element.getAttribute('id');if(id&&!anchorBlocks.has(id))anchorBlocks.set(id,blocks.length);
  if(tag==='img'){
   flush();const src=element.getAttribute('src')||'',alt=element.getAttribute('alt')||'Ilustrasi';
   if(imageOkay(src,allowBlob)&&src.length<=3_000_000){const width=Number(element.getAttribute('width')),height=Number(element.getAttribute('height'));blocks.push({kind:'image',nodes:[],text:alt,image:{src,alt,width:width>0&&width<=30000?width:1,height:height>0&&height<=30000?height:1}});}else blocks.push({kind:'text',text:'[Ilustrasi tidak didukung]',nodes:[{text:'[Ilustrasi tidak didukung]'}]});
   kind=previous;return;
  }
  if(tag==='br'){buffer.push({...style,text:'\n'});return;}
  const next={...style};if(['b','strong'].includes(tag))next.bold=true;if(['i','em'].includes(tag))next.italic=true;if(tag==='code')next.code=true;if(tag==='sup'||tag==='sub')next.script=tag;
  if(tag==='a'){
   const href=element.getAttribute('href')||'',internal=element.getAttribute('data-epub-href');
   if(internal&&internal.length<=1000)next.internal=internal;
   else if(href.startsWith('#'))next.internal=href;
   else try{const url=new URL(href);if(url.protocol==='https:'&&!url.username&&!url.password)next.href=url.href;}catch{/* No unsafe schemes. */}
  }
  for(const child of Array.from(element.childNodes))visit(child,next);
  if(boundary){flush();kind=previous;}
 };
 for(const child of Array.from(document.body.childNodes))visit(child);flush();
 const starts:number[]=[];let offset=0;for(const block of blocks){starts.push(offset);offset+=block.text.length+2;}
 const anchors=Object.fromEntries([...anchorBlocks].map(([id,index])=>[id,starts[index]??offset]));
 return {blocks,anchors,content:blocks.map(block=>block.text).join('\n\n')};
}
