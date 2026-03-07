#!/usr/bin/env node

import http from 'node:http';
import { URL } from 'node:url';

const clientId = process.env.GOOGLE_ADS_CLIENT_ID || '';
const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET || '';
const port = Number(process.env.GOOGLE_OAUTH_REDIRECT_PORT || 8787);
const redirectUri = `http://127.0.0.1:${port}/oauth2/callback`;
const scope = 'https://www.googleapis.com/auth/adwords';

if (!clientId || !clientSecret) {
  console.error('Missing env vars: GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET');
  console.error('Example:');
  console.error('  GOOGLE_ADS_CLIENT_ID=... GOOGLE_ADS_CLIENT_SECRET=... npm run ads:refresh-token');
  process.exit(1);
}

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', scope);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>OAuth Complete</title></head>
  <body style="font-family: sans-serif; padding: 24px;">
    <h2>Authorization received.</h2>
    <p>You can close this tab and return to the terminal.</p>
  </body>
</html>`;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    if (url.pathname !== '/oauth2/callback') {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const code = url.searchParams.get('code') || '';
    const error = url.searchParams.get('error') || '';

    if (error) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`<h3>OAuth error: ${error}</h3>`);
      console.error(`OAuth error: ${error}`);
      process.exitCode = 1;
      server.close();
      return;
    }

    if (!code) {
      res.writeHead(400);
      res.end('Missing code');
      process.exitCode = 1;
      server.close();
      return;
    }

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenJson = await tokenResp.json();
    const refreshToken = String(tokenJson.refresh_token || '');

    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);

    if (!tokenResp.ok || !refreshToken) {
      console.error('Failed to exchange code for refresh token.');
      console.error(JSON.stringify(tokenJson, null, 2));
      process.exitCode = 1;
      server.close();
      return;
    }

    console.log('\nGOOGLE_ADS_REFRESH_TOKEN:');
    console.log(refreshToken);
    console.log('\nSet it with:');
    console.log('firebase functions:secrets:set GOOGLE_ADS_REFRESH_TOKEN');
    server.close();
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exitCode = 1;
    server.close();
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log('Open this URL in your browser and complete consent:\n');
  console.log(authUrl.toString());
  console.log('\nWaiting for OAuth callback on', redirectUri);
});
