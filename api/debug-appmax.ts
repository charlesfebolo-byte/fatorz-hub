import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appmaxToken = process.env.APPMAX_ACCESS_TOKEN;
const appmaxApiUrl = process.env.APPMAX_API_URL;

function mask(value: string | undefined) {
  if (!value) return null;

  if (value.length <= 12) return "***";

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

export default async function handler(req: any, res: any) {
  try {
    const result: any = {
      env: {
        hasAppmaxToken: Boolean(appmaxToken),
        hasAppmaxApiUrl: Boolean(appmaxApiUrl),
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasSupabaseServiceRoleKey: Boolean(supabaseServiceRoleKey),
        appmaxApiUrl,
        supabaseUrl,
        appmaxTokenMasked: mask(appmaxToken),
        serviceRoleMasked: mask(supabaseServiceRoleKey),
      },
      courseTest: null,
    };

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(200).json({
        ...result,
        error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não foram lidos.",
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("id,title,price_cents,is_active")
      .order("id", { ascending: true });

    result.courseTest = {
      success: !error,
      error,
      courses: data,
    };

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: "Erro no debug.",
      details: error?.message || String(error),
    });
  }
}