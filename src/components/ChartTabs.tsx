"use client";
import {useState} from 'react';
import FortuneChart from './FortuneChart';
import type {ChartView} from '../../server/fortune/charts';
import './fortune.css';
export default function ChartTabs({charts}:{charts:ChartView[]}) {
 const [selected,setSelected]=useState(''); const chart=charts.find(c=>c.domain===selected)||charts[0];
 if(!chart)return null;
 return <section className="chart-tabs">{charts.length>1&&<div className="chart-tab-buttons" role="group" aria-label="기본 차트 선택">{charts.map(c=><button key={c.domain} aria-pressed={c.domain===chart.domain} onClick={()=>setSelected(c.domain)}>{c.title}</button>)}</div>}<FortuneChart chart={chart}/></section>;
}
