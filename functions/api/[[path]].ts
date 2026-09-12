import { handleApi, Env } from "../../server/api";
export function onRequest(context: {
  request: Request;
  env: Env;
  waitUntil(task: Promise<unknown>): void;
}) {
  return handleApi(context.request, context.env, (task) =>
    context.waitUntil(task),
  );
}
