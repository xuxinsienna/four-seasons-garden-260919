"use client";
import { useEffect, useRef, useState } from 'react';
import { Sun, CloudRain, Snowflake, Flower2, Leaf, Pause, Play, RotateCcw, Maximize, Eye, EyeOff, Moon, Volume2, VolumeX } from 'lucide-react';
import type { GardenAPI, GardenState } from './garden-v3';
const seasons = ['春', '夏', '秋', '冬'];
const names = ['花信风来', '绿荫听蝉', '山野知秋', '围炉听雪'];
const icons = [Flower2, Sun, Leaf, Snowflake];
export default function Home() {
 const host = useRef<HTMLDivElement>(null), api = useRef<GardenAPI|null>(null);
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 const [season,setSeason]=useState(0),[hour,setHour]=useState(10);
 const [paused,setPaused]=useState(false),[speed,setSpeed]=useState(1);
 const [weather,setWeather]=useState<'clear'|'rain'>('clear');
 const [hidden,setHidden]=useState(false),[sound,setSound]=useState(false),[help,setHelp]=useState(false);
 useEffect(()=>{let disposed=false;import('./garden-v3').then(({createGarden})=>{
  if(disposed||!host.current)return;
  api.current=createGarden(host.current,(s:GardenState)=>{setSeason(s.season);setHour(s.hour);},message=>{setReady(false);setError(message);});setReady(true);
 }).catch(()=>setError('暂时无法启动 3D 庭院，请开启浏览器硬件加速后重试。'));
 return()=>{disposed=true;api.current?.dispose();api.current=null;};},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(['INPUT','BUTTON','SELECT'].includes((e.target as HTMLElement).tagName))return;
 if(e.code==='Space'){e.preventDefault();setPaused(p=>{api.current?.setPaused(!p);return !p;});}
 if(e.key.toLowerCase()==='h')setHidden(p=>!p);if(e.key.toLowerCase()==='r')api.current?.resetView();};
 window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const time=Math.floor(hour).toString().padStart(2,'0')+':'+Math.floor(hour%1*60).toString().padStart(2,'0');
 return <main data-night={hour<6||hour>=19} className={hidden?'garden hide-ui':'garden'}>
 <div ref={host} className="scene" role="img" aria-label="可旋转的四季山林庭院，点击小猫、灯、溪水或草木可互动"/><div className="vignette"/>
 <header className="topbar ui"><a className="brand" href="/" aria-label="森间庭院首页"><span className="brand-mark">森</span><span><strong>森间</strong><small>A GARDEN IN TIME</small></span></a>
 <div className="top-right">
 <button className={sound?'icon-button active':'icon-button'} title={sound?'关闭自然声音':'开启自然声音'} aria-label={sound?'关闭自然声音':'开启自然声音'} aria-pressed={sound} onClick={()=>{const n=!sound;api.current?.setSound(n);setSound(n);}}>{sound?<Volume2/>:<VolumeX/>}</button>
 <button className="icon-button" title="全屏" aria-label="全屏" onClick={()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>{});}}><Maximize/></button></div></header>
 <section className="season-poem ui"><div className="eyebrow">四时有序 · 万物有声</div><h1>{names[season]}</h1><p>{['竹外桃花三两枝，春江水暖鸭先知。','绿树阴浓夏日长，楼台倒影入池塘。','一年好景君须记，最是橙黄橘绿时。','忽如一夜春风来，千树万树梨花开。'][season]}</p><span className="poem-line"/></section>
 {!ready&&<div className="loading" role="status">{error||'风正穿过山林…'}{error&&<button onClick={()=>location.reload()}>重新打开</button>}</div>}
 <aside className="view-tools ui"><button className="icon-button" title="回到初始视角 (R)" aria-label="回到初始视角" onClick={()=>api.current?.resetView()}><RotateCcw/></button><button className="icon-button help-trigger" title="操作说明" aria-label="操作说明" aria-expanded={help} onClick={()=>setHelp(!help)}><span>?</span></button>{help&&<div className="help">拖动旋转 · 右键拖动平移<br/>滚轮缩放 · 双指缩放与平移<br/>空格 暂停时间 · H 隐藏界面<br/>R 回到初始视角<br/>每个昼夜约 4 分钟，<br/>每 3 个昼夜进入下一个季节。</div>}</aside>
 <footer className="bottom ui"><div className="season-tabs" role="group" aria-label="选择季节">{seasons.map((s,i)=>{const Icon=icons[i];return <button key={s} aria-pressed={season===i} className={season===i?'season-tab selected':'season-tab'} onClick={()=>api.current?.setSeason(i)}><Icon/><span>{s}</span><small>{['SPRING','SUMMER','AUTUMN','WINTER'][i]}</small></button>;})}</div>
 <div className="timeline"><button className="icon-button play" title={paused?'继续时间':'暂停时间'} aria-label={paused?'继续时间':'暂停时间'} aria-pressed={paused} onClick={()=>{setPaused(!paused);api.current?.setPaused(!paused);}}>{paused?<Play/>:<Pause/>}</button><span className="time">{time}</span><Sun className="range-icon"/><input aria-label="一天中的时间" type="range" min="0" max="23.99" step=".01" value={hour} onChange={e=>{const h=Number(e.target.value);setHour(h);api.current?.setHour(h);}}/><Moon className="range-icon"/><button className="speed" title="切换时间流速" onClick={()=>{const n=speed===1?5:speed===5?20:1;setSpeed(n);api.current?.setSpeed(n);}}>{speed}×</button><div className="weather-tabs" role="group" aria-label="选择天气"><button aria-label="晴天" aria-pressed={weather==='clear'} className={weather==='clear'?'weather-tab selected':'weather-tab'} onClick={()=>{setWeather('clear');api.current?.setWeather('clear');}}><Sun/><span>晴</span></button><button aria-label={season===3?'雪天':'雨天'} aria-pressed={weather==='rain'} className={weather==='rain'?'weather-tab selected':'weather-tab'} onClick={()=>{setWeather('rain');api.current?.setWeather('rain');}}>{season===3?<Snowflake/>:<CloudRain/>}<span>{season===3?'雪':'雨'}</span></button></div></div>
 <div className="bottom-caption"><span>拖动旋转 · 双指 / 滚轮缩放</span></div></footer>
 <button className="zen-toggle icon-button" aria-label={hidden?'显示界面':'隐藏界面'} title={hidden?'显示界面 (H)':'沉浸模式 (H)'} onClick={()=>setHidden(!hidden)}>{hidden?<Eye/>:<EyeOff/>}</button></main>;
}
