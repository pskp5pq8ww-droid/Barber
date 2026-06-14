# Apple Wallet Membership Integration

## Scope

This implementation adds a reusable Apple Wallet membership architecture for Urban Kings. It is intentionally structured so the same module can later be reused inside ERA Digital Management for multiple businesses.

The current project is not Next.js. It is a Node.js server with static HTML/CSS/JS. The wallet module was therefore implemented as CommonJS under `src/lib/wallet/` and wired into `server.js`.

## Files Created

- `src/lib/wallet/config.js`
- `src/lib/wallet/storage.js`
- `src/lib/wallet/passkit.js`
- `src/lib/wallet/index.js`
- `src/assets/wallet/urban-kings/icon.png`
- `src/assets/wallet/urban-kings/icon@2x.png`
- `src/assets/wallet/urban-kings/logo.png`
- `src/assets/wallet/urban-kings/logo@2x.png`
- `src/assets/wallet/urban-kings/strip.png`
- `docs/apple-wallet-integration.md`

## Files Modified

- `server.js`
- `js/app.js`
- `js/users-data.js`
- `css/auth.css`
- `css/admin.css`
- `index.html`
- `package.json`

## Environment Variables

Required before generating a real installable `.pkpass`:

```env
APPLE_WALLET_PASS_TYPE_ID=pass.com.example.business
APPLE_WALLET_TEAM_ID=APPLE_TEAM_ID
APPLE_WALLET_ORG_NAME=Urban Kings
APPLE_WALLET_CERT_PATH=/private/wallet/certs/urban-kings-wallet-v2.pem
APPLE_WALLET_KEY_PATH=/private/wallet/certs/urban-kings-wallet-v2.key
APPLE_WALLET_CERT_PASSWORD=certificate_password
APPLE_WALLET_WWDR_CERT_PATH=/private/wallet/certs/wwdr.pem
APPLE_WALLET_STORAGE_PATH=/private/wallet/customers
APPLE_WALLET_BASE_URL=https://your-domain.com
APPLE_WALLET_BUSINESS_LOCATION=Level 1 / 123 Charlotte St, Brisbane City
ADMIN_WALLET_KEY=long_random_admin_key
```

If `APPLE_WALLET_STORAGE_PATH` is not provided, wallet metadata is stored under the app storage root:

```text
{STORAGE_ROOT}/wallet/customers/
```

## Where to Put Certificates

Do not put certificates in `assets/`, `public/`, `uploads/`, or any web-accessible folder.

Recommended Hostinger path:

```text
/home/{user}/storage/cd/wallet/certs/
```

Place:

- Pass certificate/key file referenced by `APPLE_WALLET_CERT_PATH`
- Private key referenced by `APPLE_WALLET_KEY_PATH`
- Apple WWDR certificate referenced by `APPLE_WALLET_WWDR_CERT_PATH`

The module expects readable PEM certificate files. `APPLE_WALLET_CERT_PASSWORD` is only needed if the private key is encrypted.

Expected local files created from Apple Developer:

```text
private/wallet/certs/urban-kings-wallet-v2.pem
private/wallet/certs/urban-kings-wallet-v2.key
private/wallet/certs/AppleWWDRCAG4.pem
```

Recommended local env values:

```env
APPLE_WALLET_PASS_TYPE_ID=pass.com.urbankings.wallet.v2
APPLE_WALLET_TEAM_ID=5D9PB994JW
APPLE_WALLET_ORG_NAME=Urban Kings
APPLE_WALLET_CERT_PATH=/Users/laikito/Documents/King barber/private/wallet/certs/urban-kings-wallet-v2.pem
APPLE_WALLET_KEY_PATH=/Users/laikito/Documents/King barber/private/wallet/certs/urban-kings-wallet-v2.key
APPLE_WALLET_WWDR_CERT_PATH=/Users/laikito/Documents/King barber/private/wallet/certs/AppleWWDRCAG4.pem
APPLE_WALLET_BASE_URL=https://lawngreen-wolverine-255384.hostingersite.com
```

Recommended Hostinger env values for the current deployed site:

```env
UK_STORAGE_DIR=/home/u613502604/storage/cd
APPLE_WALLET_PASS_TYPE_ID=pass.com.urbankings.wallet.v2
APPLE_WALLET_TEAM_ID=5D9PB994JW
APPLE_WALLET_ORG_NAME=Urban Kings
APPLE_WALLET_CERT_PATH=/home/u613502604/storage/cd/wallet/certs/urban-kings-wallet-v2.pem
APPLE_WALLET_KEY_PATH=/home/u613502604/storage/cd/wallet/certs/urban-kings-wallet-v2.key
APPLE_WALLET_WWDR_CERT_PATH=/home/u613502604/storage/cd/wallet/certs/AppleWWDRCAG4.pem
APPLE_WALLET_BASE_URL=https://lawngreen-wolverine-255384.hostingersite.com
```

Only set `APPLE_WALLET_CERT_PASSWORD` if the private key is encrypted. The
current `urban-kings-wallet-v2.key` should only need it if exported encrypted.
The configured `APPLE_WALLET_PASS_TYPE_ID` must match the `UID` inside the
certificate, not just the file name.

## Storage Layout

Each customer gets a private folder:

```text
wallet/customers/{customerId}/
  pass.pkpass
  metadata.json
  wallet-history.json
```

Metadata shape:

```json
{
  "walletId": "",
  "customerId": "",
  "serialNumber": "",
  "authenticationToken": "",
  "holderName": "",
  "email": "",
  "phone": "",
  "membershipStatus": "active",
  "bookingStatus": "pending",
  "visits": 0,
  "visitsGoal": 5,
  "reward": "Free Haircut After 5 Visits",
  "createdAt": "",
  "updatedAt": "",
  "lastBookingId": "",
  "lastPushAt": null,
  "passStatus": "metadata-only",
  "passError": ""
}
```

## Booking Integration

When a booking is created:

1. The server calculates the wallet customer ID.
2. If a wallet exists, it reuses the existing serial number and token.
3. If no wallet exists, it creates metadata.
4. The booking is saved with:
   - `walletSerialNumber`
   - `walletCustomerId`
   - `walletPassStatus`
   - `walletUpdatedAt`
5. If signing config and `passkit-generator` are available, `pass.pkpass` is generated.
6. If signing is missing, the booking still succeeds and the wallet stays `metadata-only`.

## Endpoints

### Generate or Reuse Wallet

```http
POST /api/wallet/generate
Content-Type: application/json

{
  "bookingId": "bk001"
}
```

Response:

```json
{
  "ok": true,
  "wallet": {
    "serialNumber": "UK-...",
    "passStatus": "metadata-only",
    "downloadUrl": "/api/wallet/download/UK-...?token=..."
  }
}
```

### Download Booking Pass

```http
POST /api/wallet/bookings/{bookingId}/pass
```

Used by the booking confirmation screen. The browser sends the booking id and the existing Wallet token from the created booking; the server loads the real booking from storage and returns the `.pkpass` file.

Response:

```http
Content-Type: application/vnd.apple.pkpass
Content-Disposition: attachment; filename="urban-kings-booking.pkpass"
Cache-Control: no-store
```

### Download Pass

```http
GET /api/wallet/download/{serialNumber}?token={authenticationToken}
```

If signing is not configured, this returns `409` with the missing configuration error.

### Admin Stats

```http
GET /api/wallet/stats
```

Requires admin session.

### Generate Test Wallet

```http
POST /api/wallet/test
```

Requires admin session.

### Update Existing Wallet

```http
POST /api/wallet/{serialNumber}/update
```

Requires admin session.

### Simulate Visit

```http
POST /api/wallet/{serialNumber}/simulate-visit
```

Requires admin session. Increments visits. At `5 / 5`, reward changes to:

```text
Free Haircut Available
```

## Apple Wallet Web Service Placeholders

The following routes are scaffolded:

```http
GET /api/wallet/v1/passes/{passTypeIdentifier}/{serialNumber}
POST /api/wallet/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
DELETE /api/wallet/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
GET /api/wallet/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}
```

Push updates are not active yet. Device registration currently returns a placeholder response.

## Admin Dashboard

Admin now has an `Apple Wallet` section showing:

- Total Wallet Members
- Wallets Generated
- Active Rewards
- Last Updates
- Missing signing configuration
- Wallet member table

Actions:

- Generate Test Wallet Pass
- Update Existing Wallet
- Simulate Visit
- Download Latest `.pkpass`

## Customer Booking Confirmation

After booking confirmation, the page now includes:

```text
Apple Wallet Membership
Add your Urban Kings membership card to Apple Wallet and receive booking updates, visit tracking and rewards.
```

Button:

```text
Add To Apple Wallet
```

If the pass is signed, the button downloads the `.pkpass`. If signing is not configured, the UI explains that certificates are required.

## How to Test Locally

Start server:

```bash
PORT=8123 node server.js
```

By default all persistent app data is stored in:

```text
storage/data/
```

That folder contains JSON files for admins, barbers, customers, bookings, payments, sessions, wallets and other app state. Backups and uploads are stored beside it:

```text
storage/backups/
storage/uploads/
```

On Hostinger, point `UK_STORAGE_DIR` to the persistent storage folder:

```env
UK_STORAGE_DIR=/home/u613502604/storage/cd
```

If you need to point exactly to a data folder, set:

```env
UK_DATA_DIR=/home/u613502604/storage/cd/data
```

Create a booking from the public booking flow, then press `Add To Apple Wallet`.

Admin test:

1. Log in as admin.
2. Open `Apple Wallet`.
3. Click `Generate Test Wallet Pass`.
4. Confirm a wallet appears in the table.
5. Click `Simulate Visit`.
6. Repeat until reward becomes available.

API test:

```bash
curl -X POST http://localhost:8123/api/wallet/generate \
  -H "Content-Type: application/json" \
  --data '{"bookingId":"bk001"}'
```

## Diagnostics & Error Reporting (added 2026-06-13)

The signing pipeline no longer collapses every failure into a single
"WWDR certificate is not readable" message. Each failure now carries a
specific machine code, the pipeline stage where it happened, and a durable,
secret-free JSON report that can be recovered later.

### Modules

- `src/lib/wallet/errors.js` — `WalletConfigurationError` (code, stage,
  safeDetails, userMessage, `cause`) + all error-code/stage constants.
- `src/lib/wallet/diagnostics.js` — `getWalletConfigurationDiagnostics(config)`
  runs the full checklist (env presence, path normalisation, exists/readable/
  size/owner/mode, empty + HTML + PEM/DER detection, X.509 parsing, cert↔key
  match, WWDR chain verification, Pass Type ID / Team ID comparison) and returns
  one structured report. Also `writeWalletReport`, `listWalletReports`,
  `readWalletReport` (sanitised — no secrets, no server stack).
- `src/lib/wallet/config.js` — `normalizeConfiguredPath` trims, strips wrapping
  quotes and zero-width/control characters (interior spaces preserved), and
  `readSecretSource(value, root, kind)` throws *specific* codes.
- `src/lib/wallet/passkit.js` — staged signing: read → parse → compare cert/key
  → verify chain → build pass.json → manifest → sign → **verify the .pkpass**
  (binary PKZip containing `pass.json`, `manifest.json`, `signature`,
  `icon.png`, `icon@2x.png`) before it is written.

### Error codes

```
WWDR_ENV_NOT_CONFIGURED  WWDR_PATH_INVALID  WWDR_FILE_NOT_FOUND
WWDR_FILE_NOT_READABLE   WWDR_FILE_EMPTY    WWDR_FORMAT_INVALID
WWDR_PARSE_FAILED        WWDR_ISSUER_MISMATCH

PASS_CERT_ENV_NOT_CONFIGURED  PASS_CERT_FILE_NOT_FOUND
PASS_CERT_FILE_NOT_READABLE   PASS_CERT_FORMAT_INVALID
PASS_CERT_PARSE_FAILED        PASS_CERT_TYPE_ID_MISMATCH
PASS_CERT_TEAM_ID_MISMATCH    PASS_CERT_EXPIRED  PASS_CERT_NOT_YET_VALID

PRIVATE_KEY_ENV_NOT_CONFIGURED  PRIVATE_KEY_FILE_NOT_FOUND
PRIVATE_KEY_FILE_NOT_READABLE   PRIVATE_KEY_FORMAT_INVALID
PRIVATE_KEY_PARSE_FAILED        PRIVATE_KEY_PASSWORD_REQUIRED
CERTIFICATE_PRIVATE_KEY_MISMATCH
```

### Admin endpoints (require an admin session)

```http
GET /api/admin/wallet/diagnostics                 # run + persist + return report
GET /api/admin/wallet/diagnostics/reports?limit=N # report history
GET /api/admin/wallet/diagnostics/reports/{id}    # one report (sanitised)
```

`GET /api/debug/apple-wallet` stays public but only returns booleans + resolved
paths (never file contents).

### Where reports are stored

```
{STORAGE_ROOT}/logs/apple-wallet/wallet-report-YYYY-MM-DD-HH-mm-ss-<requestId>.json
```

Override with `APPLE_WALLET_LOG_PATH`. The folder is auto-pruned to the latest
100 reports. If the folder is not writable, a safe console fallback is logged
with the same `reportId`. Reports never contain the private key, full PEM
bodies, passwords, tokens, cookies or auth headers — only public certificate
metadata (subject/issuer/dates/fingerprint), file paths, sizes/permissions and
booleans, plus a server-only sanitised stack that is stripped before any HTTP
response.

### Admin UI

The admin `Apple Wallet` page has an **Apple Wallet Diagnostics** panel:
`Run Diagnostics`, current status, last report, and a history table with
`View` / `Copy` / `Download JSON`. When a generate button fails, the UI shows
`Error code:` + `Report ID:` and a `Copy diagnostic reference` button.

### WWDR certificate

`APPLE_WALLET_WWDR_CERT_PATH` must point at the **Apple WWDR G4 intermediate**
(`AppleWWDRCAG4.pem`), subject `CN=Apple Worldwide Developer Relations
Certification Authority, OU=G4`. The diagnostics verify it actually signs the
Pass Type ID certificate; if not, you get `WWDR_ISSUER_MISMATCH` instead of a
guess. Download it from https://www.apple.com/certificateauthority/ and convert
with `openssl x509 -inform der -in AppleWWDRCAG4.cer -out AppleWWDRCAG4.pem`.

### Important: Pass Type ID must match the certificate

`APPLE_WALLET_PASS_TYPE_ID` must equal the `UID`/`Pass Type ID` inside
`urban-kings-wallet-v2.pem`. A mismatch produces `PASS_CERT_TYPE_ID_MISMATCH`: the
pass would sign but Apple Wallet rejects it. Either set the env var to the
certificate's real identifier or re-issue the certificate for the desired
identifier in the Apple Developer portal.

## What Remains for Real Apple Wallet Push

- Add valid Apple Pass Type ID.
- Add Apple Team ID.
- Export and install PassKit signing certificate and private key.
- Install Apple WWDR certificate.
- Confirm `passkit-generator` works on Hostinger after `npm install`.
- Implement persistent device registration storage.
- Implement push token storage.
- Send APNs push updates when wallet metadata changes.
- Add rate limiting to wallet endpoints.
- Add production-grade logging for pass signing failures.
