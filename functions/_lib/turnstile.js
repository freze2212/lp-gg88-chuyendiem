const PASS_SITEKEY = "1x00000000000000000000AA";
const PASS_SECRET = "1x0000000000000000000000000000000AA";
const isTest = (v) => /^[123]x0000/.test(String(v || ""));

export const sitekey = (env) => {
  const key = String(env.TURNSTILE_SITEKEY || "");
  return key && !isTest(key) ? key : PASS_SITEKEY;
};

export async function verifyTurnstile(env, token, ip) {
  const secret = String(env.TURNSTILE_SECRET || "");
  const use = secret && !isTest(secret) ? secret : PASS_SECRET;
  if (!token) return false;
  const form = new FormData();
  form.append("secret", use);
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
