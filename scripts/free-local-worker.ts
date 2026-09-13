import {handleApi,type Env} from '../server/api';
export default {
 fetch(request:Request,env:Env&{ASSETS:{fetch:(r:Request)=>Promise<Response>}},ctx:{waitUntil:(p:Promise<unknown>)=>void}) {
  return new URL(request.url).pathname.startsWith('/api/yeongnyangi/')?handleApi(request,env,p=>ctx.waitUntil(p)):env.ASSETS.fetch(request);
 }
};
