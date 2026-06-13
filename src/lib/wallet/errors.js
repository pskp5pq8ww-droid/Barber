"use strict";

/**
 * Centralised error model for the Apple Wallet signing + diagnostics system.
 *
 * Every failure that the wallet pipeline can produce maps to a specific,
 * machine-readable `code` plus the `stage` where it happened. This is what
 * lets the admin diagnostics report say *exactly* what is wrong instead of the
 * generic "WWDR certificate is not readable".
 *
 * Nothing in here ever carries secret material (private keys, passphrases,
 * full PEM bodies). `safeDetails` is the only free-form bag and callers must
 * keep it free of secrets.
 */

// Pipeline stages (used for reporting "where it failed").
const WALLET_STAGES = {
  VALIDATE_ENVIRONMENT: "validate-environment",
  READ_WWDR: "read-wwdr-certificate",
  READ_PASS_CERT: "read-pass-certificate",
  READ_PRIVATE_KEY: "read-private-key",
  PARSE_CERTIFICATES: "parse-certificates",
  COMPARE_CERT_KEY: "compare-certificate-and-private-key",
  VALIDATE_CHAIN: "validate-certificate-chain",
  BUILD_PASS_JSON: "build-pass-json",
  BUILD_MANIFEST: "build-manifest",
  SIGN_PASS: "sign-pass",
  RETURN_BINARY: "return-binary-pkpass",
  VERIFY_PACKAGE: "verify-pkpass-package",
};

// Specific error codes. Grouped by subject for readability.
const WALLET_CODES = {
  // Environment / configuration
  ENV_NOT_CONFIGURED: "WALLET_ENV_NOT_CONFIGURED",

  // WWDR intermediate certificate
  WWDR_ENV_NOT_CONFIGURED: "WWDR_ENV_NOT_CONFIGURED",
  WWDR_PATH_INVALID: "WWDR_PATH_INVALID",
  WWDR_FILE_NOT_FOUND: "WWDR_FILE_NOT_FOUND",
  WWDR_FILE_NOT_READABLE: "WWDR_FILE_NOT_READABLE",
  WWDR_FILE_EMPTY: "WWDR_FILE_EMPTY",
  WWDR_FORMAT_INVALID: "WWDR_FORMAT_INVALID",
  WWDR_PARSE_FAILED: "WWDR_PARSE_FAILED",
  WWDR_ISSUER_MISMATCH: "WWDR_ISSUER_MISMATCH",

  // Pass Type ID certificate
  PASS_CERT_ENV_NOT_CONFIGURED: "PASS_CERT_ENV_NOT_CONFIGURED",
  PASS_CERT_PATH_INVALID: "PASS_CERT_PATH_INVALID",
  PASS_CERT_FILE_NOT_FOUND: "PASS_CERT_FILE_NOT_FOUND",
  PASS_CERT_FILE_NOT_READABLE: "PASS_CERT_FILE_NOT_READABLE",
  PASS_CERT_FILE_EMPTY: "PASS_CERT_FILE_EMPTY",
  PASS_CERT_FORMAT_INVALID: "PASS_CERT_FORMAT_INVALID",
  PASS_CERT_PARSE_FAILED: "PASS_CERT_PARSE_FAILED",
  PASS_CERT_TYPE_ID_MISMATCH: "PASS_CERT_TYPE_ID_MISMATCH",
  PASS_CERT_TEAM_ID_MISMATCH: "PASS_CERT_TEAM_ID_MISMATCH",
  PASS_CERT_EXPIRED: "PASS_CERT_EXPIRED",
  PASS_CERT_NOT_YET_VALID: "PASS_CERT_NOT_YET_VALID",

  // Private key
  PRIVATE_KEY_ENV_NOT_CONFIGURED: "PRIVATE_KEY_ENV_NOT_CONFIGURED",
  PRIVATE_KEY_PATH_INVALID: "PRIVATE_KEY_PATH_INVALID",
  PRIVATE_KEY_FILE_NOT_FOUND: "PRIVATE_KEY_FILE_NOT_FOUND",
  PRIVATE_KEY_FILE_NOT_READABLE: "PRIVATE_KEY_FILE_NOT_READABLE",
  PRIVATE_KEY_FILE_EMPTY: "PRIVATE_KEY_FILE_EMPTY",
  PRIVATE_KEY_FORMAT_INVALID: "PRIVATE_KEY_FORMAT_INVALID",
  PRIVATE_KEY_PARSE_FAILED: "PRIVATE_KEY_PARSE_FAILED",
  PRIVATE_KEY_PASSWORD_REQUIRED: "PRIVATE_KEY_PASSWORD_REQUIRED",

  // Cross-checks
  CERTIFICATE_PRIVATE_KEY_MISMATCH: "CERTIFICATE_PRIVATE_KEY_MISMATCH",

  // Assets / packaging
  ASSET_UNREADABLE: "WALLET_ASSET_UNREADABLE",
  PASSKIT_GENERATOR_MISSING: "PASSKIT_GENERATOR_MISSING",
  SIGN_FAILED: "WALLET_SIGN_FAILED",
  PACKAGE_INVALID: "WALLET_PACKAGE_INVALID",

  // Generic fallback
  UNKNOWN: "WALLET_UNKNOWN_ERROR",
};

// Default human-friendly (but still safe) messages keyed by code. Shown to the
// admin/customer; never includes paths beyond the basename or secret content.
const SAFE_MESSAGES = {
  [WALLET_CODES.ENV_NOT_CONFIGURED]: "Apple Wallet signing is not fully configured.",
  [WALLET_CODES.WWDR_ENV_NOT_CONFIGURED]: "The Apple WWDR certificate path is not configured.",
  [WALLET_CODES.WWDR_PATH_INVALID]: "The Apple WWDR certificate path is invalid.",
  [WALLET_CODES.WWDR_FILE_NOT_FOUND]: "The Apple Wallet WWDR certificate file was not found at the configured path.",
  [WALLET_CODES.WWDR_FILE_NOT_READABLE]: "The Apple Wallet signing service could not read its WWDR certificate.",
  [WALLET_CODES.WWDR_FILE_EMPTY]: "The Apple Wallet WWDR certificate file is empty.",
  [WALLET_CODES.WWDR_FORMAT_INVALID]: "The Apple Wallet WWDR file is not a valid PEM/DER certificate.",
  [WALLET_CODES.WWDR_PARSE_FAILED]: "The Apple Wallet WWDR certificate could not be parsed as X.509.",
  [WALLET_CODES.WWDR_ISSUER_MISMATCH]: "The configured WWDR certificate does not match the issuer of the Pass Type ID certificate.",
  [WALLET_CODES.PASS_CERT_ENV_NOT_CONFIGURED]: "The Pass Type ID certificate path is not configured.",
  [WALLET_CODES.PASS_CERT_PATH_INVALID]: "The Pass Type ID certificate path is invalid.",
  [WALLET_CODES.PASS_CERT_FILE_NOT_FOUND]: "The Pass Type ID certificate file was not found at the configured path.",
  [WALLET_CODES.PASS_CERT_FILE_NOT_READABLE]: "The Apple Wallet signing service could not read its Pass Type ID certificate.",
  [WALLET_CODES.PASS_CERT_FILE_EMPTY]: "The Pass Type ID certificate file is empty.",
  [WALLET_CODES.PASS_CERT_FORMAT_INVALID]: "The Pass Type ID certificate file is not a valid PEM/DER certificate.",
  [WALLET_CODES.PASS_CERT_PARSE_FAILED]: "The Pass Type ID certificate could not be parsed as X.509.",
  [WALLET_CODES.PASS_CERT_TYPE_ID_MISMATCH]: "The Pass Type ID certificate does not match APPLE_WALLET_PASS_TYPE_ID.",
  [WALLET_CODES.PASS_CERT_TEAM_ID_MISMATCH]: "The Pass Type ID certificate does not match APPLE_WALLET_TEAM_ID.",
  [WALLET_CODES.PASS_CERT_EXPIRED]: "The Pass Type ID certificate has expired.",
  [WALLET_CODES.PASS_CERT_NOT_YET_VALID]: "The Pass Type ID certificate is not valid yet.",
  [WALLET_CODES.PRIVATE_KEY_ENV_NOT_CONFIGURED]: "The Apple Wallet private key path is not configured.",
  [WALLET_CODES.PRIVATE_KEY_PATH_INVALID]: "The Apple Wallet private key path is invalid.",
  [WALLET_CODES.PRIVATE_KEY_FILE_NOT_FOUND]: "The Apple Wallet private key file was not found at the configured path.",
  [WALLET_CODES.PRIVATE_KEY_FILE_NOT_READABLE]: "The Apple Wallet signing service could not read its private key.",
  [WALLET_CODES.PRIVATE_KEY_FILE_EMPTY]: "The Apple Wallet private key file is empty.",
  [WALLET_CODES.PRIVATE_KEY_FORMAT_INVALID]: "The Apple Wallet private key file is not a valid PEM private key.",
  [WALLET_CODES.PRIVATE_KEY_PARSE_FAILED]: "The Apple Wallet private key could not be parsed.",
  [WALLET_CODES.PRIVATE_KEY_PASSWORD_REQUIRED]: "The Apple Wallet private key is encrypted and requires APPLE_WALLET_CERT_PASSWORD.",
  [WALLET_CODES.CERTIFICATE_PRIVATE_KEY_MISMATCH]: "The Apple Wallet private key does not match the Pass Type ID certificate.",
  [WALLET_CODES.ASSET_UNREADABLE]: "A required Apple Wallet image asset is missing or unreadable.",
  [WALLET_CODES.PASSKIT_GENERATOR_MISSING]: "The Apple Wallet signing library (passkit-generator) is not installed.",
  [WALLET_CODES.SIGN_FAILED]: "The Apple Wallet pass could not be signed.",
  [WALLET_CODES.PACKAGE_INVALID]: "The generated .pkpass package failed verification.",
  [WALLET_CODES.UNKNOWN]: "An unexpected Apple Wallet signing error occurred.",
};

function safeMessageFor(code) {
  return SAFE_MESSAGES[code] || SAFE_MESSAGES[WALLET_CODES.UNKNOWN];
}

class WalletConfigurationError extends Error {
  constructor(code, { stage = "", message = "", userMessage = "", safeDetails = {}, cause } = {}) {
    const technicalMessage = message || safeMessageFor(code);
    super(technicalMessage, cause ? { cause } : undefined);
    this.name = "WalletConfigurationError";
    this.code = code || WALLET_CODES.UNKNOWN;
    this.stage = stage;
    this.userMessage = userMessage || safeMessageFor(code);
    this.safeDetails = safeDetails || {};
    // Preserve cause even on Node versions where the options bag is ignored.
    if (cause && this.cause === undefined) this.cause = cause;
  }

  /** Sanitised representation safe to embed in a JSON report or HTTP body. */
  toSafeJSON() {
    return {
      code: this.code,
      stage: this.stage,
      message: this.userMessage,
      technicalMessage: this.message,
      safeDetails: this.safeDetails,
    };
  }
}

module.exports = {
  WALLET_STAGES,
  WALLET_CODES,
  WalletConfigurationError,
  safeMessageFor,
};
