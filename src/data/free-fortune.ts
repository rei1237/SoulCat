import registry from './free-fortune-hub.json';
import type {ChartView} from '../../server/fortune/charts';
export type FreeCategory = 'comprehensive'|'basic'|'saju'|'yukhyo'|'dangsaju'|'kusei'|'psych'|'tarot'|'astrology'|'vedic'|'ziwei'|'sukuyo'|'numerology'|'dream'|'horary'|'meihua';
export const freeCategories=registry;
export const birthCategories=new Set(['comprehensive','basic','saju','dangsaju','kusei','astrology','vedic','ziwei','sukuyo','numerology']);
export interface FreeReading {
 category:string;day:string;title:string;kind:'calculated'|'symbolic'|'reflection';summary:string;
 paragraphs:string[];basis:{label:string;value:string}[];limitations:string[];charts?:ChartView[];prompt:string;version:string;
}
export interface AttendanceState {day:string;balance:number;attended:boolean;unlocked:boolean;newlyUnlocked?:boolean;awarded?:boolean}
