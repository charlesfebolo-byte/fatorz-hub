import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const debugEnabled = process.env.APPMAX_DEBUG_ENABLED === "true";
const debugSecret = process.env.APPMAX_DEBUG_SECRET;

function getHeaderValue(req: any, name: string) {
  const value = req.headers?.[name.toLowerCase()] || req.headers?.[name];

  return Array.isArray(value) ? value[0] : value;
}

function getProvidedSecret(req: any) {
  const authHeader = String(getHeaderValue(req, "authorization") || "");

  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return (
    getHeaderValue(req, "x-appmax-debug-secret") ||
    getHeaderValue(req, "x-debug-secret") ||
    req.query?.secret ||
    null
  );
}

export default async function handler(req: any, res: any) {
  if (!debugEnabled || !debugSecret) {
    return res.status(404).json({
      error: "Endpoint nao encontrado.",
    });
  }

  if (String(getProvidedSecret(req) || "") !== debugSecret) {
    return res.status(401).json({
      error: "Nao autorizado.",
    });
  }

  return res.status(200).json({
    ok: true,
    env: {
      hasAppmaxToken: Boolean(process.env.APPMAX_ACCESS_TOKEN),
      hasAppmaxApiUrl: Boolean(process.env.APPMAX_API_URL),
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  });
}
