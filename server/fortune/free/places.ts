import tzLookup from 'tz-lookup';
import { ADMIN_GEOCODE_PRESETS } from './geocode-presets.mjs';
import { FortuneError, type Place } from '../shared/contracts';
import type { Database } from '../../db/types';
export async function searchPlaces(db:Database,query:string,endpoint='https://nominatim.openstreetmap.org/search',transport=fetch) {
 const q=query.normalize('NFKC').trim().replace(/\s+/g,' ');
 if(q.length<2||q.length>120)throw new FortuneError('INVALID_PLACE_QUERY');
 const exact=ADMIN_GEOCODE_PRESETS.filter((p:{keys:string[]})=>p.keys.some(k=>k.toLowerCase()===q.toLowerCase()));
 if(exact.length)return exact.map((p:Place&{label:string})=>({...p,name:p.label,source:'Code Destiny 도시표'}));
 const cached=await db.prepare('SELECT result_json FROM place_search_cache WHERE query=? AND expires_at>?').bind(q.toLowerCase(),Date.now()).first<{result_json:string}>();
 if(cached)return JSON.parse(cached.result_json) as Place[];
 const now=Date.now();
 const slot=await db.prepare('UPDATE place_search_gate SET next_at=? WHERE id=1 AND next_at<=?').bind(now+1100,now).run();
 if(!slot.meta.changes)throw new FortuneError('PLACE_SEARCH_BUSY',429);
 const url=new URL(endpoint);url.search=new URLSearchParams({q,format:'jsonv2',limit:'6','accept-language':'ko,en',addressdetails:'1'}).toString();
 let rows;
 try {const r=await transport(url,{headers:{'User-Agent':'CodeDestinySoulCat/1.0 (+https://code-destiny.com/contact/)'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error();rows=await r.json();}catch{throw new FortuneError('PLACE_SEARCH_UNAVAILABLE',503);}
 const places:Place[]=(Array.isArray(rows)?rows:[]).flatMap(r=>{
  const latitude=Number(r.lat),longitude=Number(r.lon);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return [];
  try{return [{name:String(r.display_name).slice(0,240),latitude,longitude,timezone:tzLookup(latitude,longitude),source:'OpenStreetMap'}];}catch{return [];}
 });
 await db.prepare('INSERT INTO place_search_cache VALUES (?,?,?) ON CONFLICT(query) DO UPDATE SET result_json=excluded.result_json,expires_at=excluded.expires_at').bind(q.toLowerCase(),JSON.stringify(places),now+86400000*30).run();
 return places;
}
