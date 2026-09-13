import fs from 'node:fs';
import { requestKasiLegacyCalendarMethod } from '../server/vendor/code-destiny/worker/routes/kasi.js';
const env={};
for(const line of fs.readFileSync('D:/Development/code-destiny/.env.local','utf8').split(/\r?\n/)) {
 const m=line.match(/^\s*(KASI_SERVICE_KEY|KASI_API_BASE_URL)\s*=\s*(.*)$/);
 if(m)env[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');
}
if(!env.KASI_SERVICE_KEY)throw new Error('KASI_KEY_MISSING');
const proof=[];
for(const method of ['getLunCalInfo','get24DivisionsInfo']) {
 try {const r=await requestKasiLegacyCalendarMethod({...env,KASI_PROXY_TIMEOUT_MS:'3500'},method,{solYear:'1997',solMonth:'02',solDay:'10',numOfRows:'30'});proof.push({method,ok:r.ok,source:r.source,rows:r.rows?.length||0});}
 catch {proof.push({method,ok:false,error:'KASI_UPSTREAM_UNAVAILABLE'});}
}
fs.writeFileSync('docs/kasi-connection-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),secretPrinted:false,syntheticDate:true,proof},null,2));
console.log(JSON.stringify(proof));
