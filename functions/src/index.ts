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

const MAX_CAPTION_LENGTH = 1000;
const MAX_MEDIA_URL_LENGTH = 5000;
const MODERATION_MAX_RETRIES = 3;
const GEMINI_MODEL = 'gemini-2.5-flash-lite';

const MODERATION_SERVICE_REASONS = new Set([
  'moderation_error',
  'invalid_ai_response',
  'invalid_ai_json',
  'moderation_api_error',
]);

const SMALL_HIRAGANA_TO_NORMAL: Record<string, string> = {
  ぁ: 'あ',
  ぃ: 'い',
  ぅ: 'う',
  ぇ: 'え',
  ぉ: 'お',
  ゃ: 'や',
  ゅ: 'ゆ',
  ょ: 'よ',
  っ: 'つ',
  ゎ: 'わ',
  ゕ: 'か',
  ゖ: 'け',
};

const PROHIBITED_CAPTION_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  // "ばか", "ばーか", "バーカーーーー", "ばぁか" などを検知
  { label: 'ばか', regex: /ば+か+(?!り)/ },
  // 英字崩し "baka", "baaaaka" など
  { label: 'baka', regex: /b+a+k+a+/ },
];

type CreateModeratedPostData = {
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption?: string;
  storagePath?: string | null;
  clientMeta?: {
    platform?: string;
    userAgent?: string;
    appVersion?: string;
    language?: string;
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
  language?: 'ja' | 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ko';
};

type ResolveUserLocationData = {
  latitude?: number;
  longitude?: number;
};

type WeatherAdvice = {
  laundry: string;
  outfit: string;
  activity: string;
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

type SupportedLanguage = 'ja' | 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ko';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (err: unknown) => {
  const msg = String((err as { message?: string })?.message || '');
  return /429|500|502|503|504|timeout|temporar/i.test(msg);
};

const toHiragana = (value: string) =>
  value.replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));

const normalizeCaptionForModeration = (value: string) => {
  const normalized = String(value || '')
    .normalize('NFKC')
    .toLowerCase();

  const hiragana = toHiragana(normalized).replace(
    /[ぁぃぅぇぉゃゅょっゎゕゖ]/g,
    (ch) => SMALL_HIRAGANA_TO_NORMAL[ch] || ch
  );

  return hiragana
    .replace(/[゛゜]/g, '')
    .replace(/[ーｰ~〜～_・･\-\s\u3000.,!?！？。、/\\|'"`’”“(){}\[\]<>:;=+*#@%^&$]/g, '')
    .replace(/(.)\1{2,}/g, '$1$1');
};

const detectProhibitedCaptionTerm = (caption: string) => {
  const normalized = normalizeCaptionForModeration(caption);
  for (const rule of PROHIBITED_CAPTION_PATTERNS) {
    if (rule.regex.test(normalized)) {
      return { label: rule.label, normalized };
    }
  }
  return null;
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

const resolveSupportedLanguage = (value?: string | null): SupportedLanguage => {
  const code = String(value || '').toLowerCase().trim();
  if (code.startsWith('ja')) return 'ja';
  if (code.startsWith('en')) return 'en';
  if (code.startsWith('es')) return 'es';
  if (code.startsWith('fr')) return 'fr';
  if (code.startsWith('de')) return 'de';
  if (code.startsWith('zh')) return 'zh';
  if (code.startsWith('ko')) return 'ko';
  return 'ja';
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

const runPostIntelligenceOnce = async (params: {
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption: string;
  storagePath: string | null;
  apiKey: string;
  language: SupportedLanguage;
}) => {
  const weatherCommentLanguageLabel: Record<SupportedLanguage, string> = {
    ja: 'Japanese',
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    zh: 'Chinese',
    ko: 'Korean',
  };

  const policy = [
    'You are a strict moderator + metadata generator for a weather community app.',
    'Tasks: 1) Safety moderation, 2) spam/ad/scam detection, 3) weather comment generation, 4) auto tag generation.',
    'Block if content includes violence, gore, sexual content involving minors, hate, threats, self-harm promotion, illegal acts, harassment, explicit sexual content, scams, suspicious promotions, repetitive spam, or malicious links.',
    'If uncertain, block.',
    'Return JSON only with schema:',
    '{"allow":true|false,"reason":"short_reason","spamScore":0..1,"tags":["#tag"],"weatherComment":"short comment"}',
    'tags must be relevant weather hashtags.',
    `weatherComment must be practical, one short sentence, and written in ${weatherCommentLanguageLabel[params.language]}.`,
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
  language: SupportedLanguage;
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
    const language = resolveSupportedLanguage(payload.clientMeta?.language);

    if (mediaType !== 'image' && mediaType !== 'video') throw new HttpsError('invalid-argument', 'Invalid mediaType.');
    if (!mediaUrl || mediaUrl.length > MAX_MEDIA_URL_LENGTH) throw new HttpsError('invalid-argument', 'Invalid mediaUrl.');
    if (caption.length > MAX_CAPTION_LENGTH) throw new HttpsError('invalid-argument', 'Caption is too long.');
    if (storagePath && !storagePath.startsWith(`posts/${uid}/`)) {
      throw new HttpsError('permission-denied', 'Invalid storage path for current user.');
    }

    const prohibited = detectProhibitedCaptionTerm(caption);
    if (prohibited) {
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
        reason: `blocked_profanity:${prohibited.label}`,
        spamScore: 1,
        isSpam: true,
        createdAt: FieldValue.serverTimestamp(),
      });

      throw new HttpsError('permission-denied', 'blocked:profanity_detected');
    }

    const userSnap = await db.collection('users').doc(uid).get();
    const username = (userSnap.data()?.username as string | undefined)?.trim() || uid;

    const moderation = await runPostIntelligenceWithRetry({
      mediaType,
      mediaUrl,
      caption,
      storagePath,
      apiKey: getGeminiApiKey(),
      language,
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
    const language = resolveSupportedLanguage(payload.language);

    if (!weatherText) throw new HttpsError('invalid-argument', 'weatherText is required.');

    const languageLabel: Record<SupportedLanguage, string> = {
      ja: 'Japanese',
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      zh: 'Chinese',
      ko: 'Korean',
    };

    const prompt = [
      'You are a practical weather advisor.',
      'Return JSON only: {"laundry":"...","outfit":"...","activity":"..."}',
      'Each field must be one concise sentence under 70 characters.',
      `Write all fields in ${languageLabel[language]}.`,
      `Weather: ${weatherText}`,
      `Temperature(C): ${temperature}`,
      `Precipitation(%): ${precipitation}`,
      `Wind(m/s): ${windSpeed}`,
      `Location: ${prefecture} ${municipality}`,
      `Time: ${dateTime}`,
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
