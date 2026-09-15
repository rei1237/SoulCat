import {sessionFetch} from './session';
import { safeReturnPath } from './return-path';
export const ticketPrefix='soulcat:checkout:';
export interface Ticket { orderId:string; paymentId:string; productId:string; profileId:string; returnPath:string; generation:'pending'; createdAt:number; }
export type PaymentInput=Parameters<typeof import('@portone/browser-sdk/v2').requestPayment>[0];
export interface CheckoutOrder extends Omit<Ticket,'generation'|'createdAt'> { payment:PaymentInput; status?:string; requestId?:string; }
export class ApiError extends Error { constructor(public code:string,message:string,public data:Record<string,unknown>={}){super(message);} }
export async function apiRequest(path:string,body?:object) {
  const response=await (path==='session'?sessionFetch():fetch(`/api/yeongnyangi/${path}`,{credentials:'same-origin',method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined}));
  const data=await response.json();
  if(!response.ok) throw new ApiError(data.code||'CONNECTION_FAILED',data.message||'연결을 확인한 뒤 다시 시도해 주세요.',data);
  return data;
}
export function saveTicket(storage:Storage,order:CheckoutOrder,now=Date.now()) {
  const ticket:Ticket={orderId:order.orderId,paymentId:order.paymentId,productId:order.productId,profileId:order.profileId,returnPath:safeReturnPath(order.returnPath),generation:'pending',createdAt:now};
  const value=JSON.stringify(ticket), key=ticketPrefix+ticket.paymentId;
  try { storage.setItem(key,value); if(storage.getItem(key)!==value) throw new Error(); }
  catch { throw new Error('결제 복귀 정보를 저장하지 못했어요. 브라우저 저장소를 허용한 뒤 다시 시도해 주세요.'); }
  return ticket;
}
export function readTicket(storage:Storage,paymentId:string,orderId:string,now=Date.now()):Ticket|null {
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(paymentId)||!/^[a-zA-Z0-9_-]{1,100}$/.test(orderId)) return null;
  const key=ticketPrefix+paymentId;
  try {
    const t=JSON.parse(storage.getItem(key)||'null') as Ticket|null;
    if(!t) return null;
    if(!Number.isFinite(t.createdAt)||t.createdAt>now||now-t.createdAt>86400000){storage.removeItem(key);return null;}
    if(t.paymentId!==paymentId||t.orderId!==orderId||t.generation!=='pending')return null;
    return {...t,returnPath:safeReturnPath(t.returnPath)};
  }catch{return null;}
}
const inFlight=new Map<string,Promise<any>>();
export function confirmCheckout(ticket:Ticket,storage:Storage,verify=apiRequest) {
  const existing=inFlight.get(ticket.paymentId);if(existing)return existing;
  const task=verify('payments/verify',{orderId:ticket.orderId,paymentId:ticket.paymentId}).then(data=>{
    if(['PAID','CANCELLED','PARTIAL_CANCELLED','REFUNDED','FAILED'].includes(data.status))storage.removeItem(ticketPrefix+ticket.paymentId);
    return data;
  }).finally(()=>inFlight.delete(ticket.paymentId));
  inFlight.set(ticket.paymentId,task);return task;
}
export async function launchCheckout(order:CheckoutOrder,storage=localStorage,requestPayment: (input:PaymentInput)=>ReturnType<typeof import('@portone/browser-sdk/v2').requestPayment> = async input=>(await import('@portone/browser-sdk/v2')).requestPayment(input),verify=apiRequest) {
  const ticket=saveTicket(storage,order);
  const result=await requestPayment(order.payment);
  if(!result)return null; // A redirect may destroy this JS context.
  if(result.paymentId && result.paymentId!==ticket.paymentId)throw new Error('결제 식별자가 일치하지 않아요. 보관함에서 확인해 주세요.');
  // SDK success and failure are both hints; only the server decides paid status.
  const data=await confirmCheckout(ticket,storage,verify);
  if(result.code && data.status!=='PAID')storage.removeItem(ticketPrefix+ticket.paymentId);
  return data;
}
