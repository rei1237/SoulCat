import type { Database } from '../../db/types';
import { FortuneError } from '../shared/contracts';
export const kstDay = (now = new Date()) => new Date(now.getTime()+9*3600000).toISOString().slice(0,10);
export async function attendanceStatus(db: Database, userId: string, now = new Date()) {
 const day=kstDay(now);
 const row=await db.prepare(`SELECT COALESCE(SUM(amount),0) balance,
 COALESCE(MAX(CASE WHEN day=? AND kind='attendance' THEN 1 ELSE 0 END),0) attended,
 COALESCE(MAX(CASE WHEN day=? AND kind='unlock' THEN 1 ELSE 0 END),0) unlocked
 FROM anchovy_ledger WHERE user_id=?`).bind(day,day,userId).first<{balance:number;attended:number;unlocked:number}>();
 return {day,balance:row!.balance,attended:!!row!.attended,unlocked:!!row!.unlocked};
}
export async function attend(db:Database,userId:string,now=new Date()) {
 const r=await db.prepare(`INSERT INTO anchovy_ledger(id,user_id,day,kind,amount,created_at) VALUES (?,?,?,'attendance',1,?) ON CONFLICT(user_id,day,kind) DO NOTHING`).bind(crypto.randomUUID(),userId,kstDay(now),now.getTime()).run();
 return {...await attendanceStatus(db,userId,now),awarded:r.meta.changes===1};
}
export async function unlockToday(db:Database,userId:string,now=new Date()) {
 // One serialized SQL statement tests the balance and creates the entitlement/debit.
 // The debit itself IS the daily entitlement; no separate grant can be lost.
 const r=await db.prepare(`INSERT INTO anchovy_ledger(id,user_id,day,kind,amount,created_at)
 SELECT ?,?,?,'unlock',-1,? WHERE (SELECT COALESCE(SUM(amount),0) FROM anchovy_ledger WHERE user_id=?)>=1
 ON CONFLICT(user_id,day,kind) DO NOTHING`).bind(crypto.randomUUID(),userId,kstDay(now),now.getTime(),userId).run();
 const state=await attendanceStatus(db,userId,now);
 if(!state.unlocked)throw new FortuneError('ANCHOVY_REQUIRED',409);
 return {...state,newlyUnlocked:r.meta.changes===1};
}
export async function requireDailyPass(db:Database,userId:string,now=new Date()) {
 const state=await attendanceStatus(db,userId,now);
 if(!state.unlocked)throw new FortuneError('DAILY_PASS_REQUIRED',403);
 return state;
}
