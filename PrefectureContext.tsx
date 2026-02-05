import React, { createContext, useContext, useState } from 'react';

interface PrefectureContextType {
  selectedPrefecture: {
    name: string;
    lat: string;
    lng: string;
  };
  setSelectedPrefecture: React.Dispatch<React.SetStateAction<{ name: string; lat: string; lng: string }>>;
}

const PrefectureContext = createContext<PrefectureContextType | null>(null);

export const PrefectureProvider = ({ children }) => {
  const [selectedPrefecture, setSelectedPrefecture] = useState<{ name: string; lat: string; lng: string }>({
    name: '東京都',
    lat: '35.689488',
    lng: '139.691706',
  });

  return (
    <PrefectureContext.Provider value={{ selectedPrefecture, setSelectedPrefecture }}>
      {children}
    </PrefectureContext.Provider>
  );
};

export const usePrefecture = () => {
  return useContext(PrefectureContext);
};