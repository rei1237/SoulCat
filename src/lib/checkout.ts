import {sessionFetch} from './session';
// 영냥이 결제는 Code Destiny 결제창(/checkout/)에서만 일어난다. 이 모듈은 워커 API 호출 헬퍼만 남긴다.
export class ApiError extends Error { constructor(public code:string,message:string,public data:Record<string,unknown>={}){super(message);} }
export async function apiRequest(path:string,body?:object) {
  const response=await (path==='session'?sessionFetch():fetch(`/api/yeongnyangi/${path}`,{credentials:'same-origin',method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined}));
  const data=await response.json();
  if(!response.ok) throw new ApiError(data.code||'CONNECTION_FAILED',data.message||'연결을 확인한 뒤 다시 시도해 주세요.',data);
  return data;
}
