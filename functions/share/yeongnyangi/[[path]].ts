import { handleEdge } from '../../../server/edge';
import { renderShare } from '../../../server/worker-entry';
import type { Env } from '../../../server/api';
export function onRequest(context:{request:Request;env:Env;waitUntil(task:Promise<unknown>):void}) {
 return handleEdge(context.request,{...context.env,PUBLIC_ORIGIN:new URL(context.request.url).origin,renderShare},task=>context.waitUntil(task));
}
