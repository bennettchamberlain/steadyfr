#!/usr/bin/env node
// One-time helper: get a Google Ads refresh token for the Desktop OAuth client
// using the installed-app "loopback" flow — the method Desktop clients are built
// for. This avoids the OAuth Playground (which only works with Web clients and
// fails with redirect_uri_mismatch for a Desktop client).
//
// What it does: starts a tiny local web server, opens Google's consent screen in
// your browser, catches the redirect, exchanges the code for a refresh token, and
// writes it straight into scripts/meta-capi/.env.local as GOOGLE_ADS_REFRESH_TOKEN.
// Nothing leaves your machine except the normal Google sign-in.
//
// Needs GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET already set in
// scripts/meta-capi/.env.local (the client secret from "+ Add secret").
//
// Usage:
//   node scripts/click-lookup/get-refresh-token.mjs
//
// Note: if your OAuth consent screen is still in "Testing" mode, Google expires
// the refresh token after ~7 days — just re-run this to get a fresh one, or
// publish the consent screen to "In production" for a long-lived token.

import {readFileSync, writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'

const ENV_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'meta-capi', '.env.local')

function loadEnvFile(path) {
  const env = {}
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const key = t.slice(0, eq).trim()
      let val = t.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
      env[key] = val
    }
  } catch {
    // handled by the caller
  }
  return env
}

function fail(msg) {
  console.error(`\nError: ${msg}\n`)
  process.exit(1)
}

// Write (or replace) GOOGLE_ADS_REFRESH_TOKEN in the .env.local without touching
// anything else. If the key is present (even blank), replace its line in place.
function saveRefreshToken(path, token) {
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    fail(`could not read ${path} to save the token`)
  }
  const line = `GOOGLE_ADS_REFRESH_TOKEN=${token}`
  if (/^GOOGLE_ADS_REFRESH_TOKEN=.*$/m.test(text)) {
    text = text.replace(/^GOOGLE_ADS_REFRESH_TOKEN=.*$/m, line)
  } else {
    text = text.replace(/\n*$/, '\n') + line + '\n'
  }
  writeFileSync(path, text)
}

function openBrowser(url) {
  // macOS `open`; fall back to printing if it isn't available.
  try {
    spawn('open', [url], {stdio: 'ignore', detached: true}).unref()
  } catch {
    // ignore — we also print the URL below
  }
}

async function main() {
  const env = loadEnvFile(ENV_PATH)
  const clientId = (env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID || '').trim()
  const clientSecret = (env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET || '').trim()

  if (!clientId) fail('GOOGLE_ADS_CLIENT_ID is not set in scripts/meta-capi/.env.local')
  if (!clientSecret) {
    fail(
      'GOOGLE_ADS_CLIENT_SECRET is not set in scripts/meta-capi/.env.local.\n' +
        'Get it from Cloud Console → Credentials → your Desktop client → "+ Add secret" (shown once).',
    )
  }

  const SCOPE = 'https://www.googleapis.com/auth/adwords'

  // Start a loopback server on an ephemeral port, then use it as the redirect.
  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost')
      if (url.pathname !== '/') {
        res.writeHead(404)
        res.end()
        return
      }
      const err = url.searchParams.get('error')
      const authCode = url.searchParams.get('code')
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'})
      res.end(
        `<html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:40px">` +
          (authCode
            ? `<h2>✓ Authorized</h2><p>You can close this tab and return to the terminal.</p>`
            : `<h2>Authorization failed</h2><p>${err || 'no code returned'}</p>`) +
          `</body></html>`,
      )
      server.close()
      if (authCode) resolve(authCode)
      else reject(new Error(err || 'no authorization code returned'))
    })
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      const redirectUri = `http://localhost:${port}`
      const authUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: SCOPE,
          access_type: 'offline',
          prompt: 'consent',
        }).toString()

      // Stash the redirect for the token exchange step.
      global.__redirectUri = redirectUri

      console.log('\nOpening Google sign-in in your browser...')
      console.log('If it does not open, paste this URL into your browser:\n')
      console.log('  ' + authUrl + '\n')
      console.log('Sign in as help@superhotfab.com and click Allow. Waiting...')
      openBrowser(authUrl)
    })
  })

  // Exchange the authorization code for tokens.
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: global.__redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const data = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !data.refresh_token) {
    fail(
      `token exchange failed (${tokenRes.status}): ${data.error || ''} ${data.error_description || ''}`.trim() +
        (data.refresh_token === undefined && tokenRes.ok
          ? '\nNo refresh_token returned — revoke the app at https://myaccount.google.com/permissions and re-run (needs prompt=consent + offline access).'
          : ''),
    )
  }

  saveRefreshToken(ENV_PATH, data.refresh_token)
  console.log('\n✓ Refresh token saved to scripts/meta-capi/.env.local')
  console.log('  You can now run the gclid lookup.\n')
}

main().catch((e) => fail(e?.message || String(e)))
