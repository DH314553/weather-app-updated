import React, { useEffect } from 'react';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import { LanguageProvider } from './LanguageContext';
import { PrefectureProvider } from './PrefectureContext';
import { AuthProvider } from './AuthContext';
import { captureCampaignParams } from './utils/marketing';

export default function Root() {
  useEffect(() => {
    void captureCampaignParams();
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <PrefectureProvider>
            <BottomTabNavigator />
        </PrefectureProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};
