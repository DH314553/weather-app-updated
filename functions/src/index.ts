import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

initializeApp();

const db = getFirestore();
const storage = getStorage();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GOOGLE_ADS_DEVELOPER_TOKEN = defineSecret('GOOGLE_ADS_DEVELOPER_TOKEN');
const GOOGLE_ADS_CLIENT_ID = defineSecret('GOOGLE_ADS_CLIENT_ID');
const GOOGLE_ADS_CLIENT_SECRET = defineSecret('GOOGLE_ADS_CLIENT_SECRET');
const GOOGLE_ADS_REFRESH_TOKEN = defineSecret('GOOGLE_ADS_REFRESH_TOKEN');
const GOOGLE_ADS_CUSTOMER_ID = defineSecret('GOOGLE_ADS_CUSTOMER_ID');
const GOOGLE_ADS_MANAGER_CUSTOMER_ID = defineSecret('GOOGLE_ADS_MANAGER_CUSTOMER_ID');

const MAX_CAPTION_LENGTH = 1000;
const MAX_MEDIA_URL_LENGTH = 5000;
const MODERATION_MAX_RETRIES = 3;
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GOOGLE_ADS_API_VERSION = 'v22';

const MODERATION_SERVICE_REASONS = new Set([
  'moderation_error',
  'invalid_ai_response',
  'invalid_ai_json',
  'moderation_api_error',
]);

type CreateModeratedPostData = {
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption?: string;
  storagePath?: string | null;
  clientMeta?: {
    platform?: string;
    userAgent?: string;
    appVersion?: string;
  };
};

type GenerateWeatherAdviceData = {
  weatherText?: string;
  temperature?: number;
  precipitation?: number;
  windSpeed?: number;
  prefecture?: string;
  municipality?: string;
  dateTime?: string;
  language?: 'ja' | 'en';
};

type ResolveUserLocationData = {
  latitude?: number;
  longitude?: number;
};

type GoogleAdsListAccountsData = {
  managerCustomerId?: string;
};

type GenerateAdsCopyData = {
  productName?: string;
  productDescription?: string;
  landingPageUrl?: string;
  locale?: 'ja' | 'en';
};

type CreateSearchCampaignData = {
  customerId?: string;
  managerCustomerId?: string;
  campaignName?: string;
  adGroupName?: string;
  finalUrl?: string;
  dailyBudgetMicros?: number;
  cpcBidMicros?: number;
  headlines?: string[];
  descriptions?: string[];
  keywords?: string[];
};

type RevenueSummaryData = {
  customerId?: string;
  managerCustomerId?: string;
  dateFrom?: string;
  dateTo?: string;
};

type WeatherAdvice = {
  laundry: string;
  outfit: string;
  activity: string;
};

type GenerateAdsCopyResult = {
  headlines: string[];
  descriptions: string[];
  keywords: string[];
};

type ModerationVerdict = {
  allow: boolean;
  reason: string;
  attempts: number;
  spamScore: number;
  isSpam: boolean;
  tags: string[];
  weatherComment: string;
};

type ReverseGeoResult = {
  name?: string;
  admin1?: string;
  admin2?: string;
};

type GoogleAdsTokenResponse = {
  access_token?: string;
};

type GoogleAdsApiError = {
  error?: {
    code?: number;
    message?: string;
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (err: unknown) => {
  const msg = String((err as { message?: string })?.message || '');
  return /429|500|502|503|504|timeout|temporar/i.test(msg);
};

const parseDataUrl = (value: string) => {
  const m = String(value || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
};

const extractImageFromStorage = async (storagePath: string) => {
  const file = storage.bucket().file(storagePath);
  const [metadata] = await file.getMetadata();
  const [buf] = await file.download();
  return {
    mimeType: metadata.contentType || 'application/octet-stream',
    data: buf.toString('base64'),
  };
};

const parseJsonFromText = <T>(text: string): T | null => {
  const jsonMatch = String(text || '').match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return null;
  }
};

const parseAdviceJson = (text: string): WeatherAdvice | null => {
  const parsed = parseJsonFromText<Partial<WeatherAdvice>>(text);
  if (!parsed) return null;
  const laundry = String(parsed.laundry || '').trim().slice(0, 160);
  const outfit = String(parsed.outfit || '').trim().slice(0, 160);
  const activity = String(parsed.activity || '').trim().slice(0, 160);
  if (!laundry || !outfit || !activity) return null;
  return { laundry, outfit, activity };
};

const parseGeneratedAdsCopy = (text: string): GenerateAdsCopyResult | null => {
  const parsed = parseJsonFromText<Partial<GenerateAdsCopyResult>>(text);
  if (!parsed) return null;
  const normalize = (values: unknown, max: number) =>
    Array.isArray(values)
      ? values
          .map((v) => String(v || '').trim())
          .filter(Boolean)
          .slice(0, max)
      : [];

  const headlines = normalize(parsed.headlines, 15);
  const descriptions = normalize(parsed.descriptions, 4);
  const keywords = normalize(parsed.keywords, 20);

  if (headlines.length === 0 || descriptions.length === 0) return null;
  return { headlines, descriptions, keywords };
};

const parsePostIntelligenceJson = (text: string) => {
  const parsed = parseJsonFromText<{
    allow?: boolean;
    reason?: string;
    spamScore?: number;
    tags?: string[];
    weatherComment?: string;
  }>(text);
  if (!parsed) return null;

  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .map((v) => String(v || '').trim())
        .filter((v) => v.startsWith('#') && v.length <= 40)
        .slice(0, 8)
    : [];

  return {
    allow: parsed.allow === true,
    reason: String(parsed.reason || 'blocked').slice(0, 120),
    spamScore: Math.max(0, Math.min(1, Number(parsed.spamScore ?? 0))),
    weatherComment: String(parsed.weatherComment || '').trim().slice(0, 160),
    tags,
  };
};

const PREFECTURE_FROM_ENGLISH: Record<string, string> = {
  Hokkaido: '北海道', Aomori: '青森県', Iwate: '岩手県', Miyagi: '宮城県', Akita: '秋田県', Yamagata: '山形県',
  Fukushima: '福島県', Ibaraki: '茨城県', Tochigi: '栃木県', Gunma: '群馬県', Saitama: '埼玉県', Chiba: '千葉県',
  Tokyo: '東京都', Kanagawa: '神奈川県', Niigata: '新潟県', Toyama: '富山県', Ishikawa: '石川県', Fukui: '福井県',
  Yamanashi: '山梨県', Nagano: '長野県', Gifu: '岐阜県', Shizuoka: '静岡県', Aichi: '愛知県', Mie: '三重県',
  Shiga: '滋賀県', Kyoto: '京都府', Osaka: '大阪府', Hyogo: '兵庫県', Nara: '奈良県', Wakayama: '和歌山県',
  Tottori: '鳥取県', Shimane: '島根県', Okayama: '岡山県', Hiroshima: '広島県', Yamaguchi: '山口県', Tokushima: '徳島県',
  Kagawa: '香川県', Ehime: '愛媛県', Kochi: '高知県', Fukuoka: '福岡県', Saga: '佐賀県', Nagasaki: '長崎県',
  Kumamoto: '熊本県', Oita: '大分県', Miyazaki: '宮崎県', Kagoshima: '鹿児島県', Okinawa: '沖縄県',
};

const normalizePrefectureName = (raw: string) => {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (value.endsWith('都') || value.endsWith('道') || value.endsWith('府') || value.endsWith('県')) {
    return value;
  }
  return PREFECTURE_FROM_ENGLISH[value] || value;
};

const normalizeCustomerId = (value: string) =>
  String(value || '').replace(/[^0-9]/g, '').slice(0, 20);

const resolveGoogleAdsCustomerId = (fromRequest?: string) => {
  const requestValue = normalizeCustomerId(String(fromRequest || ''));
  if (requestValue) return requestValue;
  return normalizeCustomerId(GOOGLE_ADS_CUSTOMER_ID.value() || '');
};

const resolveGoogleAdsManagerCustomerId = (fromRequest?: string) => {
  const requestValue = normalizeCustomerId(String(fromRequest || ''));
  if (requestValue) return requestValue;
  return normalizeCustomerId(GOOGLE_ADS_MANAGER_CUSTOMER_ID.value() || '');
};

const getGeminiApiKey = () => {
  const key = GEMINI_API_KEY.value();
  if (!key) {
    throw new HttpsError('failed-precondition', 'GEMINI_API_KEY is not configured.');
  }
  return key;
};

const callGeminiText = async (prompt: string, apiKey: string) => {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    const err = new Error(`Gemini API error ${resp.status}: ${body.slice(0, 300)}`);
    (err as Error & { code?: string }).code = String(resp.status);
    throw err;
  }

  const result = (await resp.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  return (
    result.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join(' ')
      .trim() || ''
  );
};

const getGoogleAdsAccessToken = async () => {
  const clientId = GOOGLE_ADS_CLIENT_ID.value();
  const clientSecret = GOOGLE_ADS_CLIENT_SECRET.value();
  const refreshToken = GOOGLE_ADS_REFRESH_TOKEN.value();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new HttpsError('failed-precondition', 'Google Ads OAuth secrets are not configured.');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenResp.ok) {
    const text = await tokenResp.text();
    logger.error('Google OAuth token refresh failed', {
      status: tokenResp.status,
      body: text.slice(0, 300),
    });
    throw new HttpsError('unavailable', 'google_ads_oauth_failed');
  }

  const tokenJson = (await tokenResp.json()) as GoogleAdsTokenResponse;
  const accessToken = String(tokenJson.access_token || '').trim();
  if (!accessToken) {
    throw new HttpsError('unavailable', 'google_ads_oauth_empty_token');
  }

  return accessToken;
};

const getGoogleAdsHeaders = (params: {
  accessToken: string;
  developerToken: string;
  managerCustomerId?: string;
}) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.accessToken}`,
    'developer-token': params.developerToken,
    'Content-Type': 'application/json',
  };
  if (params.managerCustomerId) {
    headers['login-customer-id'] = params.managerCustomerId;
  }
  return headers;
};

const googleAdsJsonRequest = async (params: {
  path: string;
  accessToken: string;
  developerToken: string;
  managerCustomerId?: string;
  method?: 'POST' | 'GET';
  body?: unknown;
}) => {
  const method = params.method || 'POST';
  const resp = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/${params.path}`,
    {
      method,
      headers: getGoogleAdsHeaders({
        accessToken: params.accessToken,
        developerToken: params.developerToken,
        managerCustomerId: params.managerCustomerId,
      }),
      body: method === 'GET' ? undefined : JSON.stringify(params.body || {}),
    }
  );

  const text = await resp.text();
  if (!resp.ok) {
    let message = text;
    try {
      const err = JSON.parse(text) as GoogleAdsApiError;
      message = String(err.error?.message || message);
    } catch {
      // ignore JSON parse failure
    }
    throw new HttpsError(
      'unavailable',
      `google_ads_api_error:${resp.status}:${String(message || '').slice(0, 180)}`
    );
  }

  return text ? JSON.parse(text) : {};
};

const runPostIntelligenceOnce = async (params: {
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption: string;
  storagePath: string | null;
  apiKey: string;
}) => {
  const policy = [
    'You are a strict moderator + metadata generator for a weather community app.',
    'Tasks: 1) Safety moderation, 2) spam/ad/scam detection, 3) weather comment generation, 4) auto tag generation.',
    'Block if content includes violence, gore, sexual content involving minors, hate, threats, self-harm promotion, illegal acts, harassment, explicit sexual content, scams, suspicious promotions, repetitive spam, or malicious links.',
    'If uncertain, block.',
    'Return JSON only with schema:',
    '{"allow":true|false,"reason":"short_reason","spamScore":0..1,"tags":["#tag"],"weatherComment":"short comment"}',
    'tags must be relevant weather hashtags.',
    'weatherComment must be practical and one short sentence.',
  ].join(' ');

  const parts: Array<Record<string, unknown>> = [{ text: policy }];

  if (params.mediaType === 'image') {
    if (params.storagePath) {
      const inlineData = await extractImageFromStorage(params.storagePath);
      parts.push({ inline_data: { mime_type: inlineData.mimeType, data: inlineData.data } });
    } else {
      const parsed = parseDataUrl(params.mediaUrl);
      if (parsed) {
        parts.push({ inline_data: { mime_type: parsed.mimeType, data: parsed.data } });
      }
    }
  }

  parts.push({ text: `Media type: ${params.mediaType}` });
  parts.push({ text: `Media URL: ${params.mediaUrl.slice(0, 2000)}` });
  parts.push({ text: `Caption: ${params.caption.slice(0, 2000)}` });

  const endpoint =
    `https://aiplatform.googleapis.com/v1/publishers/google/models/${GEMINI_MODEL}:generateContent` +
    `?key=${encodeURIComponent(params.apiKey)}`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0 },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    const err = new Error(`Gemini API error ${resp.status}: ${body.slice(0, 300)}`);
    (err as Error & { code?: string }).code = String(resp.status);
    throw err;
  }

  const result = (await resp.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = result.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join(' ').trim() || '';
  const parsed = parsePostIntelligenceJson(text);
  if (!parsed) {
    return {
      allow: false,
      reason: 'invalid_ai_response',
      spamScore: 1,
      isSpam: true,
      tags: [],
      weatherComment: '',
    };
  }

  const isSpam = parsed.spamScore >= 0.75 || /spam|scam|fraud|ads|promotion|affiliate/i.test(parsed.reason);

  return {
    allow: parsed.allow && !isSpam,
    reason: parsed.reason || 'blocked',
    spamScore: parsed.spamScore,
    isSpam,
    tags: parsed.tags,
    weatherComment: parsed.weatherComment,
  };
};

const runPostIntelligenceWithRetry = async (params: {
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption: string;
  storagePath: string | null;
  apiKey: string;
}): Promise<ModerationVerdict> => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MODERATION_MAX_RETRIES; attempt++) {
    try {
      const verdict = await runPostIntelligenceOnce(params);
      return { ...verdict, attempts: attempt };
    } catch (err) {
      lastError = err;
      logger.warn('Moderation attempt failed', {
        attempt,
        error: String((err as { message?: string })?.message || err),
      });
      if (attempt >= MODERATION_MAX_RETRIES || !isRetryableError(err)) break;
      await sleep(250 * attempt * attempt);
    }
  }

  const maybeCode = String((lastError as { code?: string })?.code || '');
  if (/400|401|403/.test(maybeCode)) {
    return {
      allow: false,
      reason: 'moderation_api_error',
      attempts: MODERATION_MAX_RETRIES,
      spamScore: 1,
      isSpam: true,
      tags: [],
      weatherComment: '',
    };
  }
  return {
    allow: false,
    reason: 'moderation_error',
    attempts: MODERATION_MAX_RETRIES,
    spamScore: 1,
    isSpam: true,
    tags: [],
    weatherComment: '',
  };
};

export const createModeratedPost = onCall(
  {
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 10,
    secrets: [GEMINI_API_KEY],
  },
  async (request: CallableRequest<CreateModeratedPostData>) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const uid = request.auth.uid;
    const payload = (request.data || {}) as CreateModeratedPostData;

    const mediaType = payload.mediaType;
    const mediaUrl = String(payload.mediaUrl || '').trim();
    const caption = String(payload.caption || '').trim();
    const storagePath = payload.storagePath ? String(payload.storagePath) : null;

    if (mediaType !== 'image' && mediaType !== 'video') throw new HttpsError('invalid-argument', 'Invalid mediaType.');
    if (!mediaUrl || mediaUrl.length > MAX_MEDIA_URL_LENGTH) throw new HttpsError('invalid-argument', 'Invalid mediaUrl.');
    if (caption.length > MAX_CAPTION_LENGTH) throw new HttpsError('invalid-argument', 'Caption is too long.');
    if (storagePath && !storagePath.startsWith(`posts/${uid}/`)) {
      throw new HttpsError('permission-denied', 'Invalid storage path for current user.');
    }

    const userSnap = await db.collection('users').doc(uid).get();
    const username = (userSnap.data()?.username as string | undefined)?.trim() || uid;

    const moderation = await runPostIntelligenceWithRetry({
      mediaType,
      mediaUrl,
      caption,
      storagePath,
      apiKey: getGeminiApiKey(),
    });

    if (!moderation.allow) {
      if (storagePath) {
        storage
          .bucket()
          .file(storagePath)
          .delete()
          .catch((err) => logger.warn('Failed to delete blocked media', { storagePath, err: String(err) }));
      }
      await db.collection('postModerationEvents').add({
        uid,
        mediaType,
        mediaUrl: mediaUrl.slice(0, 500),
        storagePath,
        reason: moderation.reason,
        spamScore: moderation.spamScore,
        isSpam: moderation.isSpam,
        createdAt: FieldValue.serverTimestamp(),
      });

      if (MODERATION_SERVICE_REASONS.has(moderation.reason)) {
        throw new HttpsError('unavailable', `moderation_unavailable:${moderation.reason}`);
      }
      throw new HttpsError(
        'permission-denied',
        moderation.isSpam ? 'blocked:spam_detected' : `blocked:${moderation.reason}`
      );
    }

    const postRef = await db.collection('posts').add({
      author: username,
      authorUid: uid,
      createdAt: FieldValue.serverTimestamp(),
      mediaType,
      mediaUrl,
      caption,
      moderationReason: moderation.reason,
      moderationSource: 'firebase_functions_gemini_api_key',
      moderationAttempts: moderation.attempts,
      aiTags: moderation.tags,
      aiWeatherComment: moderation.weatherComment,
      spamScore: moderation.spamScore,
      isSpam: moderation.isSpam,
    });

    return { ok: true, postId: postRef.id };
  }
);

export const generateWeatherAdvice = onCall(
  {
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 20,
    maxInstances: 10,
    secrets: [GEMINI_API_KEY],
  },
  async (request: CallableRequest<GenerateWeatherAdviceData>) => {
    const payload = (request.data || {}) as GenerateWeatherAdviceData;
    const weatherText = String(payload.weatherText || '').trim().slice(0, 120);
    const temperature = Number(payload.temperature ?? 0);
    const precipitation = Number(payload.precipitation ?? 0);
    const windSpeed = Number(payload.windSpeed ?? 0);
    const prefecture = String(payload.prefecture || '').trim().slice(0, 60);
    const municipality = String(payload.municipality || '').trim().slice(0, 60);
    const dateTime = String(payload.dateTime || '').trim().slice(0, 60);
    const language = payload.language === 'en' ? 'en' : 'ja';

    if (!weatherText) throw new HttpsError('invalid-argument', 'weatherText is required.');

    const prompt =
      language === 'en'
        ? [
            'You are a practical weather advisor.',
            'Return JSON only: {"laundry":"...","outfit":"...","activity":"..."}',
            'Each field must be one concise sentence under 70 characters.',
            `Weather: ${weatherText}`,
            `Temperature(C): ${temperature}`,
            `Precipitation(%): ${precipitation}`,
            `Wind(m/s): ${windSpeed}`,
            `Location: ${prefecture} ${municipality}`,
            `Time: ${dateTime}`,
          ].join('\n')
        : [
            'あなたは実用重視の天気アドバイザーです。',
            'JSONのみで返答: {"laundry":"...","outfit":"...","activity":"..."}',
            '各項目は70文字以内の簡潔な1文。',
            `天気: ${weatherText}`,
            `気温(℃): ${temperature}`,
            `降水確率(%): ${precipitation}`,
            `風速(m/s): ${windSpeed}`,
            `地点: ${prefecture} ${municipality}`,
            `時刻: ${dateTime}`,
          ].join('\n');

    try {
      const text = await callGeminiText(prompt, getGeminiApiKey());
      const advice = parseAdviceJson(text);
      if (!advice) throw new HttpsError('unavailable', 'advice_parse_failed');
      return { ok: true, advice };
    } catch (err) {
      logger.error('generateWeatherAdvice failed', {
        error: String((err as { message?: string })?.message || err),
      });
      throw new HttpsError('unavailable', 'advice_generation_unavailable');
    }
  }
);

export const googleAdsListAccessibleCustomers = onCall(
  {
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 20,
    maxInstances: 10,
    secrets: [
      GOOGLE_ADS_DEVELOPER_TOKEN,
      GOOGLE_ADS_CLIENT_ID,
      GOOGLE_ADS_CLIENT_SECRET,
      GOOGLE_ADS_REFRESH_TOKEN,
      GOOGLE_ADS_MANAGER_CUSTOMER_ID,
    ],
  },
  async (request: CallableRequest<GoogleAdsListAccountsData>) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const developerToken = GOOGLE_ADS_DEVELOPER_TOKEN.value();
    if (!developerToken) {
      throw new HttpsError('failed-precondition', 'GOOGLE_ADS_DEVELOPER_TOKEN is not configured.');
    }

    const managerCustomerId = resolveGoogleAdsManagerCustomerId(request.data?.managerCustomerId);
    const accessToken = await getGoogleAdsAccessToken();

    const data = (await googleAdsJsonRequest({
      path: 'customers:listAccessibleCustomers',
      accessToken,
      developerToken,
      managerCustomerId,
      body: {},
    })) as { resourceNames?: string[] };

    const customers = (data.resourceNames || [])
      .map((name) => String(name || '').match(/customers\/(\d+)/)?.[1] || '')
      .filter(Boolean);

    return { ok: true, customers, count: customers.length };
  }
);

export const generateGoogleAdsCopy = onCall(
  {
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 20,
    maxInstances: 10,
    secrets: [GEMINI_API_KEY],
  },
  async (request: CallableRequest<GenerateAdsCopyData>) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const payload = (request.data || {}) as GenerateAdsCopyData;
    const productName = String(payload.productName || '').trim().slice(0, 80);
    const productDescription = String(payload.productDescription || '').trim().slice(0, 700);
    const landingPageUrl = String(payload.landingPageUrl || '').trim().slice(0, 500);
    const locale = payload.locale === 'en' ? 'en' : 'ja';

    if (!productName || !productDescription || !/^https?:\/\//.test(landingPageUrl)) {
      throw new HttpsError('invalid-argument', 'productName, productDescription, landingPageUrl are required.');
    }

    const prompt =
      locale === 'en'
        ? [
            'You are a Google Ads copywriter for Search campaigns.',
            'Return JSON only: {"headlines":[...],"descriptions":[...],"keywords":[...]}.',
            'Headlines: 8-12 items, each <= 30 chars. Descriptions: 3-4 items, each <= 90 chars.',
            `Product: ${productName}`,
            `Description: ${productDescription}`,
            `Final URL: ${landingPageUrl}`,
          ].join('\n')
        : [
            'あなたは Google 検索広告のコピーライターです。',
            'JSONのみで返答: {"headlines":[...],"descriptions":[...],"keywords":[...]}.',
            'headlines は8〜12件、1件30文字以内。descriptions は3〜4件、1件90文字以内。',
            `商品名: ${productName}`,
            `商品説明: ${productDescription}`,
            `遷移先URL: ${landingPageUrl}`,
          ].join('\n');

    try {
      const text = await callGeminiText(prompt, getGeminiApiKey());
      const copy = parseGeneratedAdsCopy(text);
      if (!copy) throw new HttpsError('unavailable', 'ads_copy_parse_failed');
      return { ok: true, ...copy };
    } catch (err) {
      logger.error('generateGoogleAdsCopy failed', {
        error: String((err as { message?: string })?.message || err),
      });
      throw new HttpsError('unavailable', 'ads_copy_generation_unavailable');
    }
  }
);

export const createGoogleAdsSearchCampaign = onCall(
  {
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 45,
    maxInstances: 10,
    secrets: [
      GOOGLE_ADS_DEVELOPER_TOKEN,
      GOOGLE_ADS_CLIENT_ID,
      GOOGLE_ADS_CLIENT_SECRET,
      GOOGLE_ADS_REFRESH_TOKEN,
      GOOGLE_ADS_CUSTOMER_ID,
      GOOGLE_ADS_MANAGER_CUSTOMER_ID,
    ],
  },
  async (request: CallableRequest<CreateSearchCampaignData>) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const payload = (request.data || {}) as CreateSearchCampaignData;
    const customerId = resolveGoogleAdsCustomerId(payload.customerId);
    const managerCustomerId = resolveGoogleAdsManagerCustomerId(payload.managerCustomerId);
    const campaignName = String(payload.campaignName || '').trim() || `WeatherApp Campaign ${Date.now()}`;
    const adGroupName = String(payload.adGroupName || '').trim() || 'Main Ad Group';
    const finalUrl = String(payload.finalUrl || '').trim();

    const dailyBudgetMicros = Math.max(500000, Math.floor(Number(payload.dailyBudgetMicros || 3000000)));
    const cpcBidMicros = Math.max(10000, Math.floor(Number(payload.cpcBidMicros || 300000)));

    const headlines = Array.isArray(payload.headlines)
      ? payload.headlines.map((v) => String(v || '').trim()).filter(Boolean).slice(0, 15)
      : [];
    const descriptions = Array.isArray(payload.descriptions)
      ? payload.descriptions.map((v) => String(v || '').trim()).filter(Boolean).slice(0, 4)
      : [];
    const keywords = Array.isArray(payload.keywords)
      ? payload.keywords.map((v) => String(v || '').trim()).filter(Boolean).slice(0, 20)
      : [];

    if (!customerId || !/^https?:\/\//.test(finalUrl) || headlines.length === 0 || descriptions.length === 0) {
      throw new HttpsError('invalid-argument', 'customerId (or GOOGLE_ADS_CUSTOMER_ID), finalUrl, headlines, descriptions are required.');
    }

    const developerToken = GOOGLE_ADS_DEVELOPER_TOKEN.value();
    if (!developerToken) {
      throw new HttpsError('failed-precondition', 'GOOGLE_ADS_DEVELOPER_TOKEN is not configured.');
    }

    const accessToken = await getGoogleAdsAccessToken();

    const budgetRes = (await googleAdsJsonRequest({
      path: `customers/${customerId}/campaignBudgets:mutate`,
      accessToken,
      developerToken,
      managerCustomerId,
      body: {
        operations: [{ create: { name: `${campaignName} Budget ${Date.now()}`, amountMicros: String(dailyBudgetMicros), deliveryMethod: 'STANDARD' } }],
      },
    })) as { results?: Array<{ resourceName?: string }> };

    const campaignBudget = String(budgetRes.results?.[0]?.resourceName || '');
    if (!campaignBudget) throw new HttpsError('unavailable', 'google_ads_budget_create_failed');

    const today = new Date();
    const startDate = `${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, '0')}${String(today.getUTCDate()).padStart(2, '0')}`;

    const campaignRes = (await googleAdsJsonRequest({
      path: `customers/${customerId}/campaigns:mutate`,
      accessToken,
      developerToken,
      managerCustomerId,
      body: {
        operations: [{
          create: {
            name: campaignName,
            status: 'PAUSED',
            advertisingChannelType: 'SEARCH',
            campaignBudget,
            startDate,
            networkSettings: {
              targetGoogleSearch: true,
              targetSearchNetwork: true,
              targetContentNetwork: false,
              targetPartnerSearchNetwork: false,
            },
          },
        }],
      },
    })) as { results?: Array<{ resourceName?: string }> };

    const campaignResourceName = String(campaignRes.results?.[0]?.resourceName || '');
    if (!campaignResourceName) throw new HttpsError('unavailable', 'google_ads_campaign_create_failed');

    const adGroupRes = (await googleAdsJsonRequest({
      path: `customers/${customerId}/adGroups:mutate`,
      accessToken,
      developerToken,
      managerCustomerId,
      body: {
        operations: [{
          create: {
            campaign: campaignResourceName,
            name: adGroupName,
            status: 'PAUSED',
            type: 'SEARCH_STANDARD',
            cpcBidMicros: String(cpcBidMicros),
          },
        }],
      },
    })) as { results?: Array<{ resourceName?: string }> };

    const adGroupResourceName = String(adGroupRes.results?.[0]?.resourceName || '');
    if (!adGroupResourceName) throw new HttpsError('unavailable', 'google_ads_adgroup_create_failed');

    await googleAdsJsonRequest({
      path: `customers/${customerId}/adGroupAds:mutate`,
      accessToken,
      developerToken,
      managerCustomerId,
      body: {
        operations: [{
          create: {
            status: 'PAUSED',
            adGroup: adGroupResourceName,
            ad: {
              finalUrls: [finalUrl],
              responsiveSearchAd: {
                headlines: headlines.map((text) => ({ text })),
                descriptions: descriptions.map((text) => ({ text })),
              },
            },
          },
        }],
      },
    });

    if (keywords.length > 0) {
      await googleAdsJsonRequest({
        path: `customers/${customerId}/adGroupCriteria:mutate`,
        accessToken,
        developerToken,
        managerCustomerId,
        body: {
          operations: keywords.map((keywordText) => ({
            create: {
              adGroup: adGroupResourceName,
              status: 'ENABLED',
              keyword: { text: keywordText, matchType: 'BROAD' },
            },
          })),
        },
      });
    }

    return {
      ok: true,
      campaignResourceName,
      adGroupResourceName,
      createdAt: new Date().toISOString(),
    };
  }
);

export const getGoogleAdsRevenueSummary = onCall(
  {
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 25,
    maxInstances: 10,
    secrets: [
      GOOGLE_ADS_DEVELOPER_TOKEN,
      GOOGLE_ADS_CLIENT_ID,
      GOOGLE_ADS_CLIENT_SECRET,
      GOOGLE_ADS_REFRESH_TOKEN,
      GOOGLE_ADS_CUSTOMER_ID,
      GOOGLE_ADS_MANAGER_CUSTOMER_ID,
    ],
  },
  async (request: CallableRequest<RevenueSummaryData>) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');

    const payload = (request.data || {}) as RevenueSummaryData;
    const customerId = resolveGoogleAdsCustomerId(payload.customerId);
    const managerCustomerId = resolveGoogleAdsManagerCustomerId(payload.managerCustomerId);
    const dateFrom = String(payload.dateFrom || '').trim();
    const dateTo = String(payload.dateTo || '').trim();

    if (!customerId || !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      throw new HttpsError('invalid-argument', 'customerId (or GOOGLE_ADS_CUSTOMER_ID), dateFrom, dateTo are required (YYYY-MM-DD).');
    }

    const developerToken = GOOGLE_ADS_DEVELOPER_TOKEN.value();
    if (!developerToken) {
      throw new HttpsError('failed-precondition', 'GOOGLE_ADS_DEVELOPER_TOKEN is not configured.');
    }

    const query = [
      'SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value',
      'FROM customer',
      `WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'`,
    ].join(' ');

    const accessToken = await getGoogleAdsAccessToken();
    const data = (await googleAdsJsonRequest({
      path: `customers/${customerId}/googleAds:searchStream`,
      accessToken,
      developerToken,
      managerCustomerId,
      body: { query },
    })) as Array<{ results?: Array<{ metrics?: Record<string, unknown> }> }>;

    let impressions = 0;
    let clicks = 0;
    let costMicros = 0;
    let conversions = 0;
    let conversionsValue = 0;

    for (const batch of Array.isArray(data) ? data : []) {
      for (const row of batch.results || []) {
        const m = row.metrics || {};
        impressions += Number(m.impressions || 0);
        clicks += Number(m.clicks || 0);
        costMicros += Number(m.costMicros || m.cost_micros || 0);
        conversions += Number(m.conversions || 0);
        conversionsValue += Number(m.conversionsValue || m.conversions_value || 0);
      }
    }

    const cost = costMicros / 1_000_000;
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpc = clicks > 0 ? cost / clicks : 0;
    const roas = cost > 0 ? conversionsValue / cost : 0;

    const summary = { dateFrom, dateTo, impressions, clicks, cost, conversions, conversionsValue, ctr, cpc, roas };

    await db.collection('adRevenueReports').add({
      uid: request.auth.uid,
      customerId,
      summary,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { ok: true, summary };
  }
);

export const resolveUserLocation = onCall(
  {
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 15,
    maxInstances: 20,
  },
  async (request: CallableRequest<ResolveUserLocationData>) => {
    const payload = (request.data || {}) as ResolveUserLocationData;
    const latitude = Number(payload.latitude);
    const longitude = Number(payload.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new HttpsError('invalid-argument', 'latitude and longitude are required.');
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new HttpsError('invalid-argument', 'latitude/longitude out of range.');
    }

    const endpoint =
      'https://geocoding-api.open-meteo.com/v1/reverse' +
      `?latitude=${encodeURIComponent(String(latitude))}` +
      `&longitude=${encodeURIComponent(String(longitude))}` +
      '&language=ja&count=1';

    const resp = await fetch(endpoint);
    if (!resp.ok) throw new HttpsError('unavailable', 'reverse_geocode_unavailable');

    const data = (await resp.json()) as { results?: ReverseGeoResult[] };
    const first = data.results?.[0];
    if (!first) throw new HttpsError('not-found', 'location_not_found');

    return {
      ok: true,
      prefecture: normalizePrefectureName(first.admin1 || ''),
      municipality: String(first.name || first.admin2 || '').trim(),
      source: 'open_meteo_reverse',
    };
  }
);
