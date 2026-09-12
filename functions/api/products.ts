import { products } from "../../server/payments/catalog";
export function onRequestGet(context: {
  env: { APP_ENV?: string; LLM_PROVIDER?: string };
}) {
  return Response.json(
    {
      products,
      mode:
        context.env.APP_ENV === "local" && context.env.LLM_PROVIDER === "mock"
          ? "local-mock"
          : "preview",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
