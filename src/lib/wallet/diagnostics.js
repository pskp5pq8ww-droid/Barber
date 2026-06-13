"use strict";

/**
 * Apple Wallet configuration diagnostics.
 *
 * `getWalletConfigurationDiagnostics(config)` inspects every signing input
 * (env vars, file paths, permissions, formats, certificate chain, key match)
 * and returns one structured, *secret-free* report object with specific error
 * codes. The same report can be persisted to disk and surfaced in the admin UI.
 *
 * Security rule for this whole file: never place private key bytes, full PEM
 * bodies, passphrases, tokens or cookies into any returned/persisted value.
 * Only public certificate metadata (subject/issuer/dates/fingerprint/serial),
 * file paths (configuration, not secret) and booleans are emitted.
 */

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const { WALLET_CODES, WALLET_STAGES, safeMessageFor } = require("./errors");
const { normalizeConfiguredPath } = require("./config");

const HEAD_BYTES = 4096;

function nowIso() {
  return new Date().toISOString();
}

function randomSuffix(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

function newReportId() {
  return `wallet-${nowIso().slice(0, 10)}-${randomSuffix(3)}`;
}

function newRequestId() {
  return `req-${randomSuffix(4)}`;
}

/** Parse a Node X509 subject/issuer string ("Type=Value" per line) into a map. */
function parseDistinguishedName(dn) {
  const out = {};
  String(dn || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .forEach(line => {
      const idx = line.indexOf("=");
      if (idx <= 0) return;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (out[key] === undefined) out[key] = value;
    });
  return out;
}

/** Best-effort byte-level format detection without trusting the extension. */
function detectFormat(buffer) {
  if (!buffer || buffer.length === 0) return "empty";
  const head = buffer.slice(0, HEAD_BYTES);
  const text = head.toString("latin1");
  const lower = text.toLowerCase();
  if (lower.includes("<!doctype html") || lower.includes("<html") || lower.includes("<head") || lower.includes("<body")) {
    return "html";
  }
  if (text.includes("-----BEGIN")) return "pem";
  // DER certificates/keys start with an ASN.1 SEQUENCE tag (0x30) + long-form length.
  if (buffer[0] === 0x30 && (buffer[1] & 0x80) !== 0) return "der";
  return "unknown";
}

/** For PEM buffers, identify the block label (CERTIFICATE / PRIVATE KEY / ...). */
function detectPemLabel(buffer) {
  const text = buffer.slice(0, HEAD_BYTES).toString("latin1");
  const match = text.match(/-----BEGIN ([A-Z0-9 ]+)-----/);
  return match ? match[1].trim() : "";
}

function pemLooksEncrypted(buffer) {
  const text = buffer.slice(0, HEAD_BYTES).toString("latin1");
  return text.includes("ENCRYPTED PRIVATE KEY") || /Proc-Type:\s*4,ENCRYPTED/i.test(text);
}

/**
 * Inspect a single configured file path. Performs the full filesystem
 * checklist (existsSync, accessSync R_OK, statSync, size, owner, format).
 * Never reads more than the head for format detection unless `fullRead`.
 */
function inspectFile(normalized, rootDir) {
  const result = {
    configured: normalized.configured,
    rawHadQuotes: normalized.hadSurroundingQuotes,
    rawHadWhitespace: normalized.hadSurroundingWhitespace,
    rawHadHiddenChars: normalized.hadHiddenChars,
    isAbsolute: normalized.isAbsolute,
    path: "",
    exists: false,
    readable: false,
    sizeBytes: null,
    empty: false,
    mode: null,
    owner: null,
    format: null,
    pemLabel: null,
    buffer: null,
  };
  if (!normalized.configured) return result;

  const resolvedPath = normalized.isAbsolute
    ? normalized.value
    : path.join(rootDir, normalized.value);
  result.path = resolvedPath;

  try {
    fs.accessSync(resolvedPath, fs.constants.F_OK);
    result.exists = true;
  } catch (_) {
    return result;
  }
  try {
    fs.accessSync(resolvedPath, fs.constants.R_OK);
    result.readable = true;
  } catch (_) {}

  try {
    const stat = fs.statSync(resolvedPath);
    result.sizeBytes = stat.size;
    result.empty = stat.size === 0;
    result.mode = "0" + (stat.mode & 0o777).toString(8);
    result.owner = { uid: stat.uid, gid: stat.gid };
    result.isFile = stat.isFile();
  } catch (_) {}

  if (result.readable && !result.empty) {
    try {
      const buffer = fs.readFileSync(resolvedPath);
      result.buffer = buffer;
      result.format = detectFormat(buffer);
      if (result.format === "pem") result.pemLabel = detectPemLabel(buffer);
    } catch (_) {
      result.readable = false;
    }
  } else if (result.empty) {
    result.format = "empty";
  }
  return result;
}

function pushError(errors, code, stage, { severity = "error", safeDetails = {}, message } = {}) {
  errors.push({
    code,
    stage,
    severity,
    message: message || safeMessageFor(code),
    safeDetails,
  });
}

/**
 * Run the filesystem checks for one source and push specific codes.
 * Returns the inspection result (with buffer) so the caller can parse it.
 */
function evaluateSourceFile(errors, kind, normalized, rootDir, codes) {
  const file = inspectFile(normalized, rootDir);
  const safe = {
    path: file.path || normalized.value,
    isAbsolute: file.isAbsolute,
    rawHadQuotes: file.rawHadQuotes,
    rawHadWhitespace: file.rawHadWhitespace,
    rawHadHiddenChars: file.rawHadHiddenChars,
  };

  if (!file.configured) {
    pushError(errors, codes.notConfigured, codes.stage, { safeDetails: { source: kind } });
    return file;
  }
  if (file.configured && !file.isAbsolute) {
    pushError(errors, codes.pathInvalid, codes.stage, {
      severity: "warning",
      safeDetails: { ...safe, note: "Configured path is not absolute; resolved against the app root." },
    });
  }
  if (!file.exists) {
    pushError(errors, codes.notFound, codes.stage, { safeDetails: safe });
    return file;
  }
  if (!file.readable) {
    pushError(errors, codes.notReadable, codes.stage, { safeDetails: safe });
    return file;
  }
  if (file.empty) {
    pushError(errors, codes.empty, codes.stage, { safeDetails: { ...safe, sizeBytes: 0 } });
    return file;
  }
  if (file.format === "html") {
    pushError(errors, codes.formatInvalid, codes.stage, {
      safeDetails: { ...safe, detectedFormat: "html", note: "File looks like a downloaded HTML/error page, not a certificate." },
    });
    return file;
  }
  return file;
}

function publicCertInfo(x509) {
  return {
    subject: x509.subject.replace(/\r?\n/g, " | "),
    issuer: x509.issuer.replace(/\r?\n/g, " | "),
    serialNumber: x509.serialNumber,
    validFrom: x509.validFrom,
    validTo: x509.validTo,
    fingerprintSha256: x509.fingerprint256,
  };
}

/**
 * Full diagnostics. `config` is the object returned by walletConfig().
 * `meta` may carry { requestId, endpoint, stage } from the failing request.
 */
function getWalletConfigurationDiagnostics(config, meta = {}) {
  const errors = [];
  const reportId = meta.reportId || newReportId();
  const requestId = meta.requestId || newRequestId();

  // --- Environment ---------------------------------------------------------
  const environment = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    appRoot: config.rootDir,
    runtime: "nodejs",
    process: {
      uid: typeof process.geteuid === "function" ? process.geteuid() : null,
      gid: typeof process.getegid === "function" ? process.getegid() : null,
    },
  };

  // --- Configuration presence ---------------------------------------------
  const configuration = {
    baseUrlConfigured: Boolean(config.baseUrl),
    teamIdConfigured: Boolean(config.teamIdentifier),
    passTypeIdConfigured: Boolean(config.passTypeIdentifier),
    wwdrPathConfigured: Boolean(config.wwdrCertPath),
    certificatePathConfigured: Boolean(config.certPath),
    privateKeyPathConfigured: Boolean(config.keyPath),
    passwordConfigured: Boolean(config.certPassword),
  };

  // Identifiers are configuration, not secrets — safe to surface.
  const identifiers = {
    teamId: config.teamIdentifier || null,
    passTypeId: config.passTypeIdentifier || null,
    baseUrl: config.baseUrl || null,
  };

  // --- Normalised paths ----------------------------------------------------
  const wwdrNorm = normalizeConfiguredPath(config.wwdrCertPath);
  const certNorm = normalizeConfiguredPath(config.certPath);
  const keyNorm = normalizeConfiguredPath(config.keyPath);

  // --- Certificate directory listing (names only) -------------------------
  const directory = inspectCertDirectory(wwdrNorm, certNorm, keyNorm, config.rootDir);

  // --- Per-file filesystem checks -----------------------------------------
  const wwdrFile = evaluateSourceFile(errors, "wwdr", wwdrNorm, config.rootDir, {
    stage: WALLET_STAGES.READ_WWDR,
    notConfigured: WALLET_CODES.WWDR_ENV_NOT_CONFIGURED,
    pathInvalid: WALLET_CODES.WWDR_PATH_INVALID,
    notFound: WALLET_CODES.WWDR_FILE_NOT_FOUND,
    notReadable: WALLET_CODES.WWDR_FILE_NOT_READABLE,
    empty: WALLET_CODES.WWDR_FILE_EMPTY,
    formatInvalid: WALLET_CODES.WWDR_FORMAT_INVALID,
  });
  const certFile = evaluateSourceFile(errors, "passCert", certNorm, config.rootDir, {
    stage: WALLET_STAGES.READ_PASS_CERT,
    notConfigured: WALLET_CODES.PASS_CERT_ENV_NOT_CONFIGURED,
    pathInvalid: WALLET_CODES.PASS_CERT_PATH_INVALID,
    notFound: WALLET_CODES.PASS_CERT_FILE_NOT_FOUND,
    notReadable: WALLET_CODES.PASS_CERT_FILE_NOT_READABLE,
    empty: WALLET_CODES.PASS_CERT_FILE_EMPTY,
    formatInvalid: WALLET_CODES.PASS_CERT_FORMAT_INVALID,
  });
  const keyFile = evaluateSourceFile(errors, "privateKey", keyNorm, config.rootDir, {
    stage: WALLET_STAGES.READ_PRIVATE_KEY,
    notConfigured: WALLET_CODES.PRIVATE_KEY_ENV_NOT_CONFIGURED,
    pathInvalid: WALLET_CODES.PRIVATE_KEY_PATH_INVALID,
    notFound: WALLET_CODES.PRIVATE_KEY_FILE_NOT_FOUND,
    notReadable: WALLET_CODES.PRIVATE_KEY_FILE_NOT_READABLE,
    empty: WALLET_CODES.PRIVATE_KEY_FILE_EMPTY,
    formatInvalid: WALLET_CODES.PRIVATE_KEY_FORMAT_INVALID,
  });

  // --- Cryptographic validation -------------------------------------------
  const certificates = { wwdr: null, passCertificate: null, privateKey: null };
  const crossChecks = {
    certificateMatchesPrivateKey: null,
    passTypeIdMatches: null,
    teamIdMatches: null,
    chain: { passCertificateIssuer: null, wwdrCertificateSubject: null, chainMatch: null },
  };

  // WWDR parse
  let wwdrX509 = null;
  if (wwdrFile.readable && !wwdrFile.empty && wwdrFile.format !== "html") {
    if (wwdrFile.format !== "pem" && wwdrFile.format !== "der") {
      pushError(errors, WALLET_CODES.WWDR_FORMAT_INVALID, WALLET_STAGES.PARSE_CERTIFICATES, {
        safeDetails: { detectedFormat: wwdrFile.format, pemLabel: wwdrFile.pemLabel || null },
      });
    } else if (wwdrFile.pemLabel && /PRIVATE KEY/.test(wwdrFile.pemLabel)) {
      pushError(errors, WALLET_CODES.WWDR_FORMAT_INVALID, WALLET_STAGES.PARSE_CERTIFICATES, {
        safeDetails: { note: "WWDR file contains a PRIVATE KEY, not a certificate." },
      });
    } else {
      try {
        wwdrX509 = new crypto.X509Certificate(wwdrFile.buffer);
        certificates.wwdr = publicCertInfo(wwdrX509);
        const dn = parseDistinguishedName(wwdrX509.subject);
        const cn = dn.CN || "";
        certificates.wwdr.looksLikeIntermediate = /Worldwide Developer Relations/i.test(cn);
        if (!certificates.wwdr.looksLikeIntermediate) {
          pushError(errors, WALLET_CODES.WWDR_FORMAT_INVALID, WALLET_STAGES.VALIDATE_CHAIN, {
            severity: "warning",
            safeDetails: { subjectCommonName: cn, note: "WWDR file does not look like an Apple WWDR intermediate certificate." },
          });
        }
      } catch (cause) {
        pushError(errors, WALLET_CODES.WWDR_PARSE_FAILED, WALLET_STAGES.PARSE_CERTIFICATES, {
          safeDetails: { reason: String(cause && cause.message || cause) },
        });
      }
    }
  }

  // Pass cert parse
  let passX509 = null;
  if (certFile.readable && !certFile.empty && certFile.format !== "html") {
    if (certFile.format !== "pem" && certFile.format !== "der") {
      pushError(errors, WALLET_CODES.PASS_CERT_FORMAT_INVALID, WALLET_STAGES.PARSE_CERTIFICATES, {
        safeDetails: { detectedFormat: certFile.format, pemLabel: certFile.pemLabel || null },
      });
    } else if (certFile.pemLabel && /PRIVATE KEY/.test(certFile.pemLabel)) {
      pushError(errors, WALLET_CODES.PASS_CERT_FORMAT_INVALID, WALLET_STAGES.PARSE_CERTIFICATES, {
        safeDetails: { note: "Pass certificate file contains a PRIVATE KEY, not a certificate." },
      });
    } else {
      try {
        passX509 = new crypto.X509Certificate(certFile.buffer);
        certificates.passCertificate = publicCertInfo(passX509);
        const dn = parseDistinguishedName(passX509.subject);
        const certPassTypeId = dn.UID || (dn.CN || "").replace(/^Pass Type ID:\s*/i, "").trim();
        const certTeamId = dn.OU || "";
        certificates.passCertificate.passTypeId = certPassTypeId || null;
        certificates.passCertificate.teamId = certTeamId || null;

        // Pass Type ID match
        if (config.passTypeIdentifier && certPassTypeId) {
          crossChecks.passTypeIdMatches = certPassTypeId === config.passTypeIdentifier;
          if (!crossChecks.passTypeIdMatches) {
            pushError(errors, WALLET_CODES.PASS_CERT_TYPE_ID_MISMATCH, WALLET_STAGES.VALIDATE_CHAIN, {
              safeDetails: { configuredPassTypeId: config.passTypeIdentifier, certificatePassTypeId: certPassTypeId },
            });
          }
        }
        // Team ID match
        if (config.teamIdentifier && certTeamId) {
          crossChecks.teamIdMatches = certTeamId === config.teamIdentifier;
          if (!crossChecks.teamIdMatches) {
            pushError(errors, WALLET_CODES.PASS_CERT_TEAM_ID_MISMATCH, WALLET_STAGES.VALIDATE_CHAIN, {
              safeDetails: { configuredTeamId: config.teamIdentifier, certificateTeamId: certTeamId },
            });
          }
        }
        // Validity window
        const now = Date.now();
        if (Number.isFinite(Date.parse(passX509.validTo)) && now > Date.parse(passX509.validTo)) {
          pushError(errors, WALLET_CODES.PASS_CERT_EXPIRED, WALLET_STAGES.PARSE_CERTIFICATES, {
            safeDetails: { validTo: passX509.validTo },
          });
        } else if (Number.isFinite(Date.parse(passX509.validFrom)) && now < Date.parse(passX509.validFrom)) {
          pushError(errors, WALLET_CODES.PASS_CERT_NOT_YET_VALID, WALLET_STAGES.PARSE_CERTIFICATES, {
            severity: "warning",
            safeDetails: { validFrom: passX509.validFrom },
          });
        }
      } catch (cause) {
        pushError(errors, WALLET_CODES.PASS_CERT_PARSE_FAILED, WALLET_STAGES.PARSE_CERTIFICATES, {
          safeDetails: { reason: String(cause && cause.message || cause) },
        });
      }
    }
  }

  // Private key parse
  let keyObject = null;
  if (keyFile.readable && !keyFile.empty && keyFile.format !== "html") {
    if (keyFile.format !== "pem" && keyFile.format !== "der") {
      pushError(errors, WALLET_CODES.PRIVATE_KEY_FORMAT_INVALID, WALLET_STAGES.PARSE_CERTIFICATES, {
        safeDetails: { detectedFormat: keyFile.format },
      });
    } else if (keyFile.format === "pem" && keyFile.pemLabel && /CERTIFICATE/.test(keyFile.pemLabel)) {
      pushError(errors, WALLET_CODES.PRIVATE_KEY_FORMAT_INVALID, WALLET_STAGES.PARSE_CERTIFICATES, {
        safeDetails: { note: "Private key file contains a CERTIFICATE, not a private key." },
      });
    } else {
      const encrypted = keyFile.format === "pem" && pemLooksEncrypted(keyFile.buffer);
      if (encrypted && !config.certPassword) {
        pushError(errors, WALLET_CODES.PRIVATE_KEY_PASSWORD_REQUIRED, WALLET_STAGES.PARSE_CERTIFICATES, {
          safeDetails: { encrypted: true },
        });
      }
      try {
        keyObject = crypto.createPrivateKey({
          key: keyFile.buffer,
          ...(config.certPassword ? { passphrase: config.certPassword } : {}),
        });
        certificates.privateKey = { type: keyObject.asymmetricKeyType || "unknown", encrypted: Boolean(encrypted) };
      } catch (cause) {
        const reason = String(cause && cause.message || cause);
        const code = /bad decrypt|passphrase|password/i.test(reason)
          ? WALLET_CODES.PRIVATE_KEY_PASSWORD_REQUIRED
          : WALLET_CODES.PRIVATE_KEY_PARSE_FAILED;
        pushError(errors, code, WALLET_STAGES.PARSE_CERTIFICATES, { safeDetails: { reason } });
      }
    }
  }

  // --- Cross checks --------------------------------------------------------
  if (passX509 && keyObject) {
    try {
      crossChecks.certificateMatchesPrivateKey = passX509.checkPrivateKey(keyObject);
    } catch (_) {
      crossChecks.certificateMatchesPrivateKey = false;
    }
    if (crossChecks.certificateMatchesPrivateKey === false) {
      pushError(errors, WALLET_CODES.CERTIFICATE_PRIVATE_KEY_MISMATCH, WALLET_STAGES.COMPARE_CERT_KEY, {
        safeDetails: { note: "Public key derived from the certificate and the private key do not match." },
      });
    }
  }

  if (passX509 && wwdrX509) {
    crossChecks.chain.passCertificateIssuer = passX509.issuer.replace(/\r?\n/g, " | ");
    crossChecks.chain.wwdrCertificateSubject = wwdrX509.subject.replace(/\r?\n/g, " | ");
    let signed = false;
    try {
      signed = passX509.verify(wwdrX509.publicKey);
    } catch (_) {
      signed = false;
    }
    const issuerMatches = passX509.issuer === wwdrX509.subject;
    crossChecks.chain.chainMatch = Boolean(issuerMatches && signed);
    crossChecks.chain.issuerNameMatches = issuerMatches;
    crossChecks.chain.signatureVerified = signed;
    if (!crossChecks.chain.chainMatch) {
      pushError(errors, WALLET_CODES.WWDR_ISSUER_MISMATCH, WALLET_STAGES.VALIDATE_CHAIN, {
        safeDetails: {
          passCertificateIssuer: crossChecks.chain.passCertificateIssuer,
          wwdrCertificateSubject: crossChecks.chain.wwdrCertificateSubject,
          issuerNameMatches: issuerMatches,
          signatureVerified: signed,
        },
      });
    }
  }

  // --- Flat checks (matches the spec's example shape) ---------------------
  const checks = {
    wwdrConfigured: Boolean(wwdrNorm.configured),
    wwdrExists: wwdrFile.exists,
    wwdrReadable: wwdrFile.readable && !wwdrFile.empty,
    wwdrParsed: Boolean(wwdrX509),
    passCertificateConfigured: Boolean(certNorm.configured),
    passCertificateExists: certFile.exists,
    passCertificateReadable: certFile.readable && !certFile.empty,
    passCertificateParsed: Boolean(passX509),
    privateKeyConfigured: Boolean(keyNorm.configured),
    privateKeyExists: keyFile.exists,
    privateKeyReadable: keyFile.readable && !keyFile.empty,
    privateKeyParsed: Boolean(keyObject),
    certificateMatchesPrivateKey: crossChecks.certificateMatchesPrivateKey,
    chainMatch: crossChecks.chain.chainMatch,
    passTypeIdMatches: crossChecks.passTypeIdMatches,
    teamIdMatches: crossChecks.teamIdMatches,
  };

  // --- Safe path snapshots (no secrets) -----------------------------------
  const paths = {
    wwdr: safePathSnapshot(wwdrFile, wwdrNorm),
    passCertificate: safePathSnapshot(certFile, certNorm),
    privateKey: safePathSnapshot(keyFile, keyNorm),
  };

  // --- Status + headline ---------------------------------------------------
  const hasError = errors.some(e => e.severity === "error");
  const hasWarning = errors.some(e => e.severity === "warning");
  const status = hasError ? "failed" : hasWarning ? "warning" : "healthy";
  const primary = errors.find(e => e.severity === "error") || errors.find(e => e.severity === "warning") || null;

  return {
    reportId,
    requestId,
    generatedAt: nowIso(),
    endpoint: meta.endpoint || null,
    status,
    stage: primary ? primary.stage : null,
    primaryCode: primary ? primary.code : null,
    environment,
    configuration,
    identifiers,
    directory,
    paths,
    certificates,
    crossChecks,
    checks,
    errors,
  };
}

function safePathSnapshot(file, normalized) {
  return {
    configured: normalized.configured,
    path: file.path || normalized.value || null,
    isAbsolute: file.isAbsolute,
    exists: file.exists,
    readable: file.readable,
    empty: file.empty,
    sizeBytes: file.sizeBytes,
    mode: file.mode,
    owner: file.owner,
    format: file.format,
    pemLabel: file.pemLabel || null,
    rawHadSurroundingQuotes: file.rawHadQuotes,
    rawHadSurroundingWhitespace: file.rawHadWhitespace,
    rawHadHiddenChars: file.rawHadHiddenChars,
  };
}

/** List the cert directory (derived from the WWDR path) — names only. */
function inspectCertDirectory(wwdrNorm, certNorm, keyNorm, rootDir) {
  const candidate = [wwdrNorm, certNorm, keyNorm].find(n => n.configured && n.value);
  if (!candidate) return { path: null, exists: false, readable: false, filesFound: [] };
  const resolved = candidate.isAbsolute ? candidate.value : path.join(rootDir, candidate.value);
  const dir = path.dirname(resolved);
  const out = { path: dir, exists: false, readable: false, filesFound: [] };
  try {
    fs.accessSync(dir, fs.constants.F_OK);
    out.exists = true;
  } catch (_) {
    return out;
  }
  try {
    out.filesFound = fs.readdirSync(dir).sort();
    out.readable = true;
  } catch (_) {}
  return out;
}

// --- Report persistence ----------------------------------------------------

const MAX_PERSISTED_REPORTS = 100;

function reportFileName(report) {
  const ts = report.generatedAt.replace(/[:.]/g, "-").replace("T", "-").replace("Z", "");
  return `wallet-report-${ts}-${report.requestId}.json`;
}

/** Best-effort cap on report files so the log folder cannot grow unbounded. */
async function pruneWalletReports(logsDir, max) {
  try {
    const names = (await fsp.readdir(logsDir)).filter(n => /^wallet-report-.*\.json$/.test(n)).sort();
    if (names.length <= max) return;
    const toDelete = names.slice(0, names.length - max);
    await Promise.all(toDelete.map(n => fsp.unlink(path.join(logsDir, n)).catch(() => {})));
  } catch (_) {
    // Pruning is non-critical.
  }
}

/**
 * Persist a report to {storageRoot}/logs/apple-wallet/. The persisted file
 * additionally carries a sanitised server-side stack under `serverDetails`.
 * If writing fails, logs a safe console fallback carrying the same reportId.
 */
async function writeWalletReport(config, report, serverDetails = {}) {
  const logsDir = config.logsPath;
  const persisted = {
    ...report,
    serverDetails: sanitizeServerDetails(serverDetails),
  };
  try {
    await fsp.mkdir(logsDir, { recursive: true });
    const filePath = path.join(logsDir, reportFileName(report));
    await fsp.writeFile(filePath, `${JSON.stringify(persisted, null, 2)}\n`, "utf8");
    await pruneWalletReports(logsDir, MAX_PERSISTED_REPORTS);
    return { written: true, filePath, reportId: report.reportId };
  } catch (cause) {
    // Safe console fallback — same reportId so it can be correlated later.
    console.error("[wallet-diagnostics] report persistence failed", JSON.stringify({
      reportId: report.reportId,
      requestId: report.requestId,
      status: report.status,
      primaryCode: report.primaryCode,
      stage: report.stage,
      reason: String(cause && cause.message || cause),
    }));
    return { written: false, reportId: report.reportId, error: String(cause && cause.message || cause) };
  }
}

/** Strip anything that could carry secrets from server-side details. */
function sanitizeServerDetails(details) {
  if (!details || typeof details !== "object") return {};
  const stack = typeof details.stack === "string"
    ? details.stack.split(/\r?\n/).slice(0, 30).join("\n")
    : null;
  return {
    stage: details.stage || null,
    code: details.code || null,
    technicalMessage: details.technicalMessage || null,
    stack,
  };
}

/** Remove server-only details before sending a report to any client. */
function sanitizeReportForClient(report) {
  if (!report || typeof report !== "object") return report;
  const { serverDetails, ...safe } = report;
  return safe;
}

function summarizeReport(report) {
  return {
    reportId: report.reportId,
    requestId: report.requestId,
    generatedAt: report.generatedAt,
    status: report.status,
    primaryCode: report.primaryCode,
    stage: report.stage,
    endpoint: report.endpoint || null,
  };
}

async function listWalletReports(config, { limit = 50 } = {}) {
  const logsDir = config.logsPath;
  let names = [];
  try {
    names = (await fsp.readdir(logsDir)).filter(n => /^wallet-report-.*\.json$/.test(n));
  } catch (_) {
    return [];
  }
  names.sort().reverse();
  const out = [];
  for (const name of names.slice(0, limit)) {
    try {
      const parsed = JSON.parse(await fsp.readFile(path.join(logsDir, name), "utf8"));
      out.push({ ...summarizeReport(parsed), fileName: name });
    } catch (_) {
      out.push({ reportId: null, fileName: name, status: "unreadable" });
    }
  }
  return out;
}

async function readWalletReport(config, reportId) {
  const logsDir = config.logsPath;
  let names = [];
  try {
    names = (await fsp.readdir(logsDir)).filter(n => /^wallet-report-.*\.json$/.test(n));
  } catch (_) {
    return null;
  }
  for (const name of names) {
    try {
      const parsed = JSON.parse(await fsp.readFile(path.join(logsDir, name), "utf8"));
      if (parsed.reportId === reportId || name === reportId) {
        return sanitizeReportForClient(parsed);
      }
    } catch (_) {}
  }
  return null;
}

module.exports = {
  getWalletConfigurationDiagnostics,
  writeWalletReport,
  listWalletReports,
  readWalletReport,
  sanitizeReportForClient,
  summarizeReport,
  newReportId,
  newRequestId,
  detectFormat,
  parseDistinguishedName,
};
