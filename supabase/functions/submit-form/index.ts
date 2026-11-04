// ==============================================================================
// SUPABASE EDGE FUNCTION: submit-form
// Securely verifies Cloudflare Turnstile token server-side before database insertion
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_SECRET_PREFIXES = ["1x0000000", "2x0000000", "3x0000000"];

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { turnstileToken, name, email, job_title, join, comments, locale } = payload;

    // 1. Missing Token Check
    if (!turnstileToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Turnstile verification token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Secret Key verification with Cloudflare Turnstile API
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY")?.trim();
    if (!turnstileSecret) {
      console.error("TURNSTILE_SECRET_KEY environment variable is not configured!");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Security verification service is not configured. Submission blocked.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Never allow test keys in production
    if (TEST_SECRET_PREFIXES.some((prefix) => turnstileSecret.startsWith(prefix))) {
      console.error("Test secret key rejected in production!");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Production Turnstile secret key required.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = new URLSearchParams();
    formData.append("secret", turnstileSecret);
    formData.append("response", turnstileToken);

    const clientIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for");
    if (clientIp) {
      formData.append("remoteip", clientIp);
    }

    // 3. Call Cloudflare siteverify with timeout
    let cfData: any;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const cfRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      cfData = await cfRes.json();
    } catch (netErr) {
      console.error("Cloudflare verification unreachable:", netErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Security verification service is temporarily unavailable. Please try again later.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Reject if verification failed
    if (!cfData || !cfData.success) {
      console.warn("Turnstile verification failed:", cfData?.["error-codes"]);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Bot protection verification failed. Please try again.",
          errorCodes: cfData?.["error-codes"],
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Verification Passed -> Insert into PostgreSQL using Supabase service-role client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("invitation_submissions")
      .insert([
        {
          name: String(name).trim(),
          email: String(email).trim(),
          job_title: String(job_title).trim(),
          join: Array.isArray(join) ? join : [join],
          comments: comments ? Number(comments) : null,
          locale: locale || "en",
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("Database insert error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
