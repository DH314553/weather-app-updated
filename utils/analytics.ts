import { Platform } from 'react-native';

type AnalyticsModule = {
  logScreenView: (params: { screen_name: string; screen_class?: string }) => Promise<void>;
  logEvent: (name: string, params?: Record<string, any>) => Promise<void>;
  setUserProperties: (properties: Record<string, string | null>) => Promise<void>;
};

let analyticsInstance: AnalyticsModule | null = null;
let analyticsInitialized = false;

const getAnalytics = (): AnalyticsModule | null => {
  if (Platform.OS === 'web') return null;
  if (analyticsInitialized) return analyticsInstance;
  try {
    // Lazy require to avoid web bundling issues.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const analytics = require('@react-native-firebase/analytics').default;
    analyticsInstance = analytics();
    analyticsInitialized = true;
    return analyticsInstance;
  } catch (err) {
    analyticsInstance = null;
    analyticsInitialized = true;
    return null;
  }
};

export const logScreenView = async (screenName: string) => {
  const analytics = getAnalytics();
  if (!analytics) return;
  await analytics.logScreenView({ screen_name: screenName, screen_class: screenName });
};

export const logEvent = async (name: string, params?: Record<string, any>) => {
  const analytics = getAnalytics();
  if (!analytics) return;
  await analytics.logEvent(name, params);
};

export const setUserProperties = async (properties: Record<string, string | null>) => {
  const analytics = getAnalytics();
  if (!analytics) return;
  await analytics.setUserProperties(properties);
};
