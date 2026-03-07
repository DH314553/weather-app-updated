import React from 'react';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import { LanguageProvider } from './LanguageContext';
import { PrefectureProvider } from './PrefectureContext';
import { AuthProvider } from './AuthContext';

export default function Root() {
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
