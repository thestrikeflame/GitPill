// Twilio Function — paste this into Console > Functions and Assets > Functions > Add.
// Path: /send-alert   Visibility: Public
//
// Set these Environment Variables (Functions and Assets > Configure):
//   FROM_NUMBER = your Twilio phone number, e.g. +15551234567
//
// The Function reads TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN automatically —
// no need to set those yourself.
//
// GitPill's Settings > Family member alerts posts here as
// application/x-www-form-urlencoded with fields "to" and "body", so Twilio
// parses them straight into event.to / event.body without any JSON parsing.
//
// After deploying, copy the Function's URL into GitPill's "SMS relay URL" field.

exports.handler = function (context, event, callback) {
  var response = new Twilio.Response();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.appendHeader('Content-Type', 'application/json');

  if (event.request && event.request.method === 'OPTIONS') {
    response.setStatusCode(204);
    return callback(null, response);
  }

  var to = event.to;
  var body = event.body;

  if (!to || !body) {
    response.setStatusCode(400);
    response.setBody({ success: false, error: 'Missing "to" or "body".' });
    return callback(null, response);
  }

  var client = context.getTwilioClient();
  client.messages
    .create({ to: to, from: context.FROM_NUMBER, body: body })
    .then(function (message) {
      response.setBody({ success: true, sid: message.sid });
      callback(null, response);
    })
    .catch(function (err) {
      response.setStatusCode(500);
      response.setBody({ success: false, error: err.message });
      callback(null, response);
    });
};
