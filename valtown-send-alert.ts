// val.town HTTP val — free SMS relay for GitPill (no Twilio upgrade, no credit card).
//
// Setup (≈2 min):
//   1. Sign up / log in at val.town.
//   2. Create a new val > choose "HTTP" > paste this whole file > Save.
//      (val.town auto-deploys; your endpoint appears as the "http" URL, like
//       https://<username>-<valname>.web.val.run)
//   3. Add secrets: go to val.town > Settings > Environment Variables, add:
//        TWILIO_ACCOUNT_SID  (Twilio Console home > Account Info, starts with AC…)
//        TWILIO_AUTH_TOKEN   (Twilio Console home > Account Info, Auth Token)
//        FROM_NUMBER         (your Twilio number, e.g. +15551234567)
//   4. Copy the val's http URL into GitPill's Settings > "SMS relay URL".
//
// GitPill posts application/x-www-form-urlencoded with fields "to" and "body".
// Twilio trial accounts can only text VERIFIED numbers — verify the emergency
// contact under Phone Numbers > Manage > Verified Caller IDs first.

export default async function (req: Request): Promise<Response> {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Use POST." }, 405);
  }

  const form = await req.formData();
  const to = form.get("to");
  const body = form.get("body");
  if (!to || !body) {
    return json({ success: false, error: 'Missing "to" or "body".' }, 400);
  }

  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("FROM_NUMBER");
  if (!sid || !token || !from) {
    return json(
      { success: false, error: "Relay is missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / FROM_NUMBER." },
      500,
    );
  }

  const params = new URLSearchParams();
  params.set("To", String(to));
  params.set("From", from);
  params.set("Body", String(body));

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${sid}:${token}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );
  const data = await resp.json().catch(() => ({}));
  if (resp.ok) {
    return json({ success: true, sid: data.sid });
  }
  return json({ success: false, error: data.message || ("Twilio HTTP " + resp.status) }, 500);
}
