import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { logEvent } from './analytics';

const CAMPAIGN_KEY = 'campaign_params_v1';
const TRACK_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'wbraid',
  'gbraid',
  'ref',
];

export type CampaignParams = Record<string, string> & { ts?: number };

const parseCampaignParams = (rawUrl: string): CampaignParams | null => {
  try {
    const url = new URL(rawUrl);
    const params: CampaignParams = {};
    TRACK_PARAMS.forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) params[key] = value;
    });
    if (Object.keys(params).length === 0) return null;
    params.ts = Date.now();
    return params;
  } catch (err) {
    return null;
  }
};

const persistCampaignParams = async (params: CampaignParams) => {
  const payload = JSON.stringify(params);
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CAMPAIGN_KEY, payload);
    }
    return;
  }
  await AsyncStorage.setItem(CAMPAIGN_KEY, payload);
};

export const getCampaignParams = async (): Promise<CampaignParams | null> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(CAMPAIGN_KEY);
      return raw ? (JSON.parse(raw) as CampaignParams) : null;
    }
    const raw = await AsyncStorage.getItem(CAMPAIGN_KEY);
    return raw ? (JSON.parse(raw) as CampaignParams) : null;
  } catch {
    return null;
  }
};

export const captureCampaignParams = async () => {
  let targetUrl: string | null = null;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') targetUrl = window.location.href;
  } else {
    targetUrl = await Linking.getInitialURL();
  }

  if (!targetUrl) return null;
  const params = parseCampaignParams(targetUrl);
  if (!params) return null;

  await persistCampaignParams(params);
  logEvent('campaign_landing', params).catch(() => {});
  return params;
};

export const buildCampaignUrl = (baseUrl: string, overrides?: Partial<CampaignParams>) => {
  const url = new URL(baseUrl);
  const defaults: CampaignParams = {
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'stogia_launch',
  };
  const params = { ...defaults, ...(overrides || {}) } as CampaignParams;
  Object.entries(params).forEach(([key, value]) => {
    if (!value || key === 'ts') return;
    url.searchParams.set(key, value);
  });
  return url.toString();
};
