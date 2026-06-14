"use strict";

/**
 * Apple Push Notification service (APNs) client for Wallet pass updates.
 *
 * Authentication reuses the Pass Type ID certificate + private key (the same
 * files used to sign the pass) as a TLS client certificate — no separate APNs
 * credential is required. When a pass changes, we POST an empty body to
 * /3/device/{pushToken} with `apns-topic: <passTypeIdentifier>`; the device
 * then re-fetches the updated pass from the Wallet web service.
 *
 * Security: pushTokens and certificate material never appear in returned
 * values, only structured status + APNs reason strings.
 */

const http2 = require("http2");

const DEFAULT_HOST = "api.push.apple.com";
const DEFAULT_PORT = 443;
const REQUEST_TIMEOUT_MS = 10000;
const CONNECT_TIMEOUT_MS = 10000;

function apnsHost() {
  // Wallet passes use the production APNs gateway. Overridable for testing.
  return process.env.APPLE_WALLET_APNS_HOST || DEFAULT_HOST;
}

function apnsPort() {
  return Number(process.env.APPLE_WALLET_APNS_PORT || DEFAULT_PORT) || DEFAULT_PORT;
}

/**
 * Open one HTTP/2 session to APNs authenticated with the pass certificate.
 * Returns the session or throws a structured error (never includes key bytes).
 */
function connect({ cert, key, passphrase, host = apnsHost(), port = apnsPort() }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let client;
    try {
      client = http2.connect(`https://${host}:${port}`, {
        cert,
        key,
        ...(passphrase ? { passphrase } : {}),
      });
    } catch (err) {
      return reject(normalizeConnError(err));
    }
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { client.destroy(); } catch (_) {}
      reject(Object.assign(new Error("APNs connection timed out"), { apnsErrorCode: "CONNECT_TIMEOUT" }));
    }, CONNECT_TIMEOUT_MS);

    client.once("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(normalizeConnError(err));
    });
    client.once("connect", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(client);
    });
  });
}

function normalizeConnError(err) {
  const code = err && err.code;
  // Surface a safe, classified reason without leaking key/cert contents.
  let apnsErrorCode = "CONNECTION_ERROR";
  if (/CERT|SSL|TLS|ERR_TLS|EPROTO/i.test(String(code || err.message))) apnsErrorCode = "TLS_OR_CERT_ERROR";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") apnsErrorCode = "DNS_ERROR";
  if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "ETIMEDOUT") apnsErrorCode = "NETWORK_ERROR";
  return Object.assign(new Error(`APNs connection failed (${apnsErrorCode})`), { apnsErrorCode, cause: err });
}

/**
 * Send one push over an existing session.
 * Resolves with { ok, status, reason, apnsId } — never rejects for HTTP-level
 * APNs errors (those carry a reason); only network/stream faults reject.
 */
function sendOne(client, pushToken, topic, pushType) {
  return new Promise((resolve) => {
    const headers = {
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
      "apns-topic": topic,
      "apns-priority": "10",
    };
    if (pushType) headers["apns-push-type"] = pushType;

    let req;
    try {
      req = client.request(headers);
    } catch (err) {
      return resolve({ ok: false, status: 0, reason: "STREAM_ERROR", apnsId: "" });
    }
    let status = 0;
    let apnsId = "";
    let body = "";
    const timer = setTimeout(() => {
      try { req.close(http2.constants.NGHTTP2_CANCEL); } catch (_) {}
      resolve({ ok: false, status: 0, reason: "REQUEST_TIMEOUT", apnsId: "" });
    }, REQUEST_TIMEOUT_MS);

    req.on("response", (h) => {
      status = Number(h[":status"]) || 0;
      apnsId = h["apns-id"] || "";
    });
    req.setEncoding("utf8");
    req.on("data", (chunk) => { body += chunk; });
    req.on("error", () => {
      clearTimeout(timer);
      resolve({ ok: false, status: 0, reason: "STREAM_ERROR", apnsId: "" });
    });
    req.on("end", () => {
      clearTimeout(timer);
      let reason = "";
      if (body) { try { reason = JSON.parse(body).reason || ""; } catch (_) {} }
      resolve({ ok: status === 200, status, reason, apnsId });
    });

    // PassKit update notifications carry an empty payload.
    req.end("{}");
  });
}

/**
 * Push an update to many device tokens using a single session.
 * @returns {Promise<{ sent, results, connectError }>}
 *   results: [{ deviceLibraryIdentifier, status, reason, ok, unregistered }]
 */
async function pushToDevices({ cert, key, passphrase, topic, devices, host, port }) {
  const pushType = process.env.APPLE_WALLET_APNS_PUSH_TYPE || ""; // omitted by default for PassKit
  if (!Array.isArray(devices) || devices.length === 0) {
    return { sent: 0, results: [], connectError: null };
  }
  let client;
  try {
    client = await connect({ cert, key, passphrase, host, port });
  } catch (err) {
    return { sent: 0, results: [], connectError: { code: err.apnsErrorCode || "CONNECTION_ERROR", message: err.message } };
  }

  const results = [];
  try {
    for (const device of devices) {
      if (!device || !device.pushToken) {
        results.push({ deviceLibraryIdentifier: device && device.deviceLibraryIdentifier, ok: false, status: 0, reason: "NO_PUSH_TOKEN", unregistered: false });
        continue;
      }
      const r = await sendOne(client, device.pushToken, topic, pushType);
      results.push({
        deviceLibraryIdentifier: device.deviceLibraryIdentifier,
        ok: r.ok,
        status: r.status,
        reason: r.reason,
        // APNs 410 (Unregistered) / 400 BadDeviceToken => the token is dead.
        unregistered: r.status === 410 || r.reason === "Unregistered" || r.reason === "BadDeviceToken",
      });
    }
  } finally {
    try { client.close(); } catch (_) {}
  }
  const sent = results.filter(r => r.ok).length;
  return { sent, results, connectError: null };
}

module.exports = { pushToDevices, connect, sendOne, apnsHost, apnsPort };
