import { httpsCallable } from 'firebase/functions';
import { functionsClient } from './firebase';

export type GenerateAdsCopyInput = {
  productName: string;
  productDescription: string;
  landingPageUrl: string;
  locale?: 'ja' | 'en';
};

export type GenerateAdsCopyOutput = {
  ok: boolean;
  headlines: string[];
  descriptions: string[];
  keywords: string[];
};

export type CreateSearchCampaignInput = {
  customerId?: string;
  managerCustomerId?: string;
  campaignName?: string;
  adGroupName?: string;
  finalUrl: string;
  dailyBudgetMicros?: number;
  cpcBidMicros?: number;
  headlines: string[];
  descriptions: string[];
  keywords?: string[];
};

export type RevenueSummaryInput = {
  customerId?: string;
  managerCustomerId?: string;
  dateFrom: string;
  dateTo: string;
};

export const generateGoogleAdsCopy = async (input: GenerateAdsCopyInput) => {
  const fn = httpsCallable(functionsClient, 'generateGoogleAdsCopy');
  const res = await fn(input);
  return res.data as GenerateAdsCopyOutput;
};

export const createGoogleAdsSearchCampaign = async (input: CreateSearchCampaignInput) => {
  const fn = httpsCallable(functionsClient, 'createGoogleAdsSearchCampaign');
  const res = await fn(input);
  return res.data as {
    ok: boolean;
    campaignResourceName: string;
    adGroupResourceName: string;
    createdAt: string;
  };
};

export const getGoogleAdsRevenueSummary = async (input: RevenueSummaryInput) => {
  const fn = httpsCallable(functionsClient, 'getGoogleAdsRevenueSummary');
  const res = await fn(input);
  return res.data as {
    ok: boolean;
    summary: {
      dateFrom: string;
      dateTo: string;
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      conversionsValue: number;
      ctr: number;
      cpc: number;
      roas: number;
    };
  };
};
