// Cloudflare Worker — free SMS relay for GitPill (no Twilio upgrade needed).
//
// Deploy at dash.cloudflare.com (free, no credit card):
//   1. Workers & Pages > Create > Create Worker > name it (e.g. gitpill-sms) > Deploy.
//   2. Edit code > paste this whole file > Deploy.
//   3. Worker > Settings > Variables and Secrets, add three:
//        TWILIO_ACCOUNT_SID  (Twilio Console home > Account Info, starts with AC…)  [Secret]
//        TWILIO_AUTH_TOKEN   (Twilio Console home > Account Info, Auth Token)        [Secret]
//        FROM_NUMBER         (your Twilio number, e.g. +15551234567)                [Text or Secret]
//   4. Copy the Worker URL (https://gitpill-sms.<you>.workers.dev) into GitPill's
//      Settings > "SMS relay URL". The path can be the root — no /send-alert needed.
//
// GitPill posts application/x-www-form-urlencoded with fields "to" and "body".
// Twilio trial accounts can only text VERIFIED numbers — verify the emergency
// contact under Phone Numbers > Manage > Verified Caller IDs first.

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    const json = (obj, status) =>
      new Response(JSON.stringify(obj), {
        status: status || 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return json({ success: false, error: 'Use POST.' }, 405);
    }

    const form = await request.formData();
    const to = form.get('to');
    const body = form.get('body');
    if (!to || !body) {
      return json({ success: false, error: 'Missing "to" or "body".' }, 400);
    }

    const sid = env.TWILIO_ACCOUNT_SID;
    const token = env.TWILIO_AUTH_TOKEN;
    const from = env.FROM_NUMBER;
    if (!sid || !token || !from) {
      return json({ success: false, error: 'Relay is missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / FROM_NUMBER.' }, 500);
    }

    const params = new URLSearchParams();
    params.set('To', to);
    params.set('From', from);
    params.set('Body', body);

    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );
    const data = await resp.json().catch(() => ({}));
    if (resp.ok) {
      return json({ success: true, sid: data.sid });
    }
    return json({ success: false, error: data.message || ('Twilio HTTP ' + resp.status) }, 500);
  },
};
