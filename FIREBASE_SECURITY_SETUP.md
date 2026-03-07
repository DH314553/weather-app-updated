# Firebase Security Setup

## Added Files
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`
- `functions/src/index.ts`
- `functions/package.json`
- `functions/tsconfig.json`

## What The Current Rules Enforce

### Firestore
- `users/{uid}`
  - Read/write only by the owner (`request.auth.uid == uid`)
  - Only allowed fields: `username`, `usernameLower`, `createdAt`, `updatedAt`
- `posts/{postId}`
  - Public read
  - Client write is fully blocked
  - Only trusted backend (Cloud Functions Admin SDK) can create/update/delete

### Storage
- `posts/{uid}/{fileName}`
  - Public read
  - Write/delete only by owner (`request.auth.uid == uid`)
  - Max upload size 20MB
  - MIME type must be `image/*` or `video/*`

## Important: AI Moderation Security

Current app uses Cloud Functions (`createModeratedPost`) to run moderation with Vertex AI.
This is significantly safer than client-only moderation.

Deployment steps for strict mode:
1. Enable `Cloud Functions`, `Vertex AI in Firebase`, `Firestore`, and `Storage`.
2. Deploy rules and indexes.
3. Install function dependencies and deploy functions.

## Deploy
Run in project root:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Deploy functions:

```bash
cd functions
npm install
npm run build
cd ..
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set GOOGLE_ADS_DEVELOPER_TOKEN
firebase functions:secrets:set GOOGLE_ADS_CLIENT_ID
firebase functions:secrets:set GOOGLE_ADS_CLIENT_SECRET
firebase functions:secrets:set GOOGLE_ADS_REFRESH_TOKEN
firebase functions:secrets:set GOOGLE_ADS_CUSTOMER_ID
firebase functions:secrets:set GOOGLE_ADS_MANAGER_CUSTOMER_ID
firebase deploy --only functions
```

Generate `GOOGLE_ADS_REFRESH_TOKEN` (local helper):

```bash
cd functions
GOOGLE_ADS_CLIENT_ID="<your-client-id>" GOOGLE_ADS_CLIENT_SECRET="<your-client-secret>" npm run ads:refresh-token
```

Then copy the printed token and set secret:

```bash
firebase functions:secrets:set GOOGLE_ADS_REFRESH_TOKEN
```

If needed, set Firebase project first:

```bash
firebase use <your-project-id>
```

## Notes
- Function name: `createModeratedPost` (callable HTTPS).
- Function name: `generateWeatherAdvice` (callable HTTPS, AI weather advice).
- Function name: `resolveUserLocation` (callable HTTPS, server-side reverse geocoding).
- Function name: `googleAdsListAccessibleCustomers` (callable HTTPS, Google Ads API).
- Function name: `generateGoogleAdsCopy` (callable HTTPS, ad copy auto generation).
- Function name: `createGoogleAdsSearchCampaign` (callable HTTPS, search campaign creation).
- Function name: `getGoogleAdsRevenueSummary` (callable HTTPS, revenue aggregation).
- Optional default Ads IDs via Secrets:
  - `GOOGLE_ADS_CUSTOMER_ID`
  - `GOOGLE_ADS_MANAGER_CUSTOMER_ID`
- Moderation API key secret name: `GEMINI_API_KEY` (managed in Firebase Functions Secrets).
- Firestore client now reads `posts` in realtime, but post creation goes through function only.
- Function source is TypeScript and built to `functions/lib/index.js`.
- Moderation audit is stored in `postModerationEvents`.
