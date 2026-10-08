// Cloudflare official test keys (always pass) until TURNSTILE_SITEKEY / TURNSTILE_SECRET are set on the Pages project.
const TEST_SITEKEY = "1x00000000000000000000AA";
const TEST_SECRET = "1x0000000000000000000000000000000AA";

export const sitekey = (env) => env.TURNSTILE_SITEKEY || TEST_SITEKEY;

export async function verifyTurnstile(env, token, ip) {
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET || TEST_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const j = await r.json();
    return !!j.success;
  } catch {
    return false;
  }
}
