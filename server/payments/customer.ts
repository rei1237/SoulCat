import {FortuneError} from '../fortune/shared/contracts';
export type CustomerField='fullName'|'phoneNumber'|'email';
const fields:CustomerField[]=['fullName','phoneNumber','email'];
function normalized(field:CustomerField,value:unknown){
  if(typeof value!=='string')return '';
  const text=value.trim();
  if(field==='fullName')return text.length>0&&text.length<=60&&!/[\u0000-\u001f@]/.test(text)?text:'';
  if(field==='email')return text.length<=120&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)?text:'';
  const phone=text.replace(/[\s()-]/g,'').replace(/^\+82/,'0');
  return /^0\d{8,10}$/.test(phone)?phone:'';
}
export function customerFields(value:Partial<Record<CustomerField,unknown>>){return fields.filter(field=>!normalized(field,value[field]));}
export function resolveCustomer(saved:Partial<Record<CustomerField,unknown>>,input:unknown){
  const manual=input&&typeof input==='object'&&!Array.isArray(input)?input as Record<string,unknown>:{};
  const customer=Object.fromEntries(fields.map(field=>[field,normalized(field,saved[field])||normalized(field,manual[field])])) as Record<CustomerField,string>;
  if(customerFields(customer).length)throw new FortuneError('CUSTOMER_REQUIRED',400);
  return customer;
}
