import { logEvent, setUserProperties } from './analytics';

export type AdsRevenueAssumptions = {
  dau: number;
  impressionsPerUserPerDay: number;
  fillRatePercent: number;
  ecpmJpy: number;
};

export type AdsRevenueEstimate = {
  monthlyImpressions: number;
  monthlyRevenueLow: number;
  monthlyRevenueBase: number;
  monthlyRevenueHigh: number;
};

const DEFAULT_ASSUMPTIONS: AdsRevenueAssumptions = {
  dau: 500,
  impressionsPerUserPerDay: 3,
  fillRatePercent: 70,
  ecpmJpy: 80,
};

const clamp = (num: number, min: number, max: number) => Math.min(max, Math.max(min, num));

export const estimateMonthlyAdsRevenue = (
  assumptions: Partial<AdsRevenueAssumptions> = {}
): AdsRevenueEstimate => {
  const dau = Math.max(0, Number(assumptions.dau ?? DEFAULT_ASSUMPTIONS.dau));
  const impressionsPerUserPerDay = Math.max(
    0,
    Number(assumptions.impressionsPerUserPerDay ?? DEFAULT_ASSUMPTIONS.impressionsPerUserPerDay)
  );
  const fillRatePercent = clamp(
    Number(assumptions.fillRatePercent ?? DEFAULT_ASSUMPTIONS.fillRatePercent),
    0,
    100
  );
  const ecpmJpy = Math.max(0, Number(assumptions.ecpmJpy ?? DEFAULT_ASSUMPTIONS.ecpmJpy));

  const monthlyImpressions = dau * impressionsPerUserPerDay * 30 * (fillRatePercent / 100);
  const monthlyRevenueBase = (monthlyImpressions / 1000) * ecpmJpy;

  return {
    monthlyImpressions,
    monthlyRevenueLow: monthlyRevenueBase * 0.7,
    monthlyRevenueBase,
    monthlyRevenueHigh: monthlyRevenueBase * 1.3,
  };
};

export const trackAdsRevenueEstimate = async (
  assumptions: Partial<AdsRevenueAssumptions> = {}
) => {
  const normalized: AdsRevenueAssumptions = {
    ...DEFAULT_ASSUMPTIONS,
    ...assumptions,
  };
  const estimate = estimateMonthlyAdsRevenue(normalized);

  await setUserProperties({
    ads_android_provider: 'admob',
    ads_web_provider: 'adsense',
  });

  await logEvent('ads_revenue_estimate_monthly', {
    dau: Math.round(normalized.dau),
    impressions_per_user_per_day: Number(normalized.impressionsPerUserPerDay.toFixed(2)),
    fill_rate_percent: Number(normalized.fillRatePercent.toFixed(2)),
    ecpm_jpy: Number(normalized.ecpmJpy.toFixed(2)),
    monthly_impressions: Math.round(estimate.monthlyImpressions),
    monthly_revenue_low_jpy: Number(estimate.monthlyRevenueLow.toFixed(2)),
    monthly_revenue_base_jpy: Number(estimate.monthlyRevenueBase.toFixed(2)),
    monthly_revenue_high_jpy: Number(estimate.monthlyRevenueHigh.toFixed(2)),
  });
};

