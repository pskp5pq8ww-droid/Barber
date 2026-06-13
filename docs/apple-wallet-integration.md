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
/home/{user}/domains/{domain}/private/wallet/certs/
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
UK_STORAGE_DIR="/path/to/project/storage/cd" PORT=8123 node server.js
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
