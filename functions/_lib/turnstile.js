export const sitekey = (env) => {
  const key = String(env.TURNSTILE_SITEKEY || "");
  if (!key || /^[123]x0000/.test(key)) return "";
  return key;
};

export async function verifyTurnstile(env, token, ip) {
  const secret = String(env.TURNSTILE_SECRET || "");
  if (!secret || /^[123]x0000/.test(secret)) return true;
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
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
