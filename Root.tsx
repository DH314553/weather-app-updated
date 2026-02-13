import React from 'react';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import { LanguageProvider } from './LanguageContext';
import { PrefectureProvider } from './PrefectureContext';

export default function Root() {
  return (
    <LanguageProvider>
      <PrefectureProvider>
          <BottomTabNavigator />
      </PrefectureProvider>
    </LanguageProvider>
  );
};
