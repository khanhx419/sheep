import { cloneElement, isValidElement, useSyncExternalStore } from 'react';
import { EN } from './locales/en.js';
export const LANGUAGE_KEY='under-the-wool-language';
export function readLanguage(storage){try{return storage?.getItem(LANGUAGE_KEY)==='en'?'en':'vi';}catch{return 'vi';}}
let language=readLanguage(typeof localStorage==='undefined'?null:localStorage);
const listeners=new Set();
export function getLanguage(){return language;}
export function setLanguage(next){if(!['vi','en'].includes(next))return;language=next;try{localStorage.setItem(LANGUAGE_KEY,next);}catch{};if(typeof document!=='undefined'){document.documentElement.lang=next;document.title=next==='en'?'Under the Wool — Mist Farm':'Dưới Lớp Lông — Trại Sương';}listeners.forEach(fn=>fn());}
export function subscribeLanguage(fn){listeners.add(fn);return()=>listeners.delete(fn);}
export function useLanguage(){return useSyncExternalStore(subscribeLanguage,getLanguage,()=> 'vi');}
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const patterns=Object.entries(EN).filter(([key])=>key.includes('{x}')).sort((a,b)=>b[0].length-a[0].length).map(([key,value])=>[new RegExp('^'+key.split('{x}').map(escape).join('(.*?)')+'$','s'),value]);
const fragments=Object.entries(EN).filter(([key])=>key.includes('{x}')&&!key.startsWith('{x}')&&!key.endsWith('{x}')).sort((a,b)=>b[0].length-a[0].length).map(([key,value])=>[new RegExp(key.split('{x}').map(escape).join('(.*?)'),'gs'),value]);
const phrases=Object.keys(EN).filter(key=>!key.includes('{x}')&&key.trim()).sort((a,b)=>b.length-a.length);
const phrasePattern=new RegExp(phrases.map(key=>`(?<![\\p{L}])${escape(key)}(?![\\p{L}])`).join('|'),'gu');
const cache=new Map();
export function translate(text,locale=language,depth=0){
 if(locale!=='en'||typeof text!=='string')return text;
 if(depth!==0)return translateText(text,locale,depth);
 if(cache.has(text))return cache.get(text);
 const result=translateText(text,locale,depth);
 if(cache.size>=2000)cache.clear();cache.set(text,result);return result;
}
function translateText(text,locale,depth){
 if(locale!=='en'||typeof text!=='string'||!text.trim())return text;
 if(EN[text]!=null)return EN[text];
 const trimmed=text.trim();if(EN[trimmed]!=null)return text.replace(trimmed,EN[trimmed]);
 if(depth<4)for(const [pattern,replacement]of patterns){const match=pattern.exec(text);if(match){let index=0;return replacement.replace(/\{x\}/g,()=>translate(match[++index],locale,depth+1));}}
 let output=text;
 if(depth<4)for(const [pattern,replacement]of fragments)output=output.replace(pattern,(...args)=>{let index=0;return replacement.replace(/\{x\}/g,()=>translate(args[++index],locale,depth+1));});
 return output.replace(phrasePattern,key=>EN[key]);
}
export function tr(value){
 if(typeof value==='string')return translate(value);
 if(language!=='en')return value;
 if(Array.isArray(value))return value.map(tr);
 if(isValidElement(value)){
  const props={};if(typeof value.type==='string')for(const key of ['aria-label','title','alt','placeholder'])if(typeof value.props[key]==='string')props[key]=translate(value.props[key]);
  const children=value.props.children;
  if(children!==undefined)return Array.isArray(children)?cloneElement(value,props,...children.map(tr)):cloneElement(value,props,tr(children));
  return cloneElement(value,props);
 }
 return value;
}
