import React, { createContext, useContext, useState } from 'react';

// 型の定義を再利用しやすく抽出
export interface Prefecture {
  name: string;
  lat: string;
  lng: string;
}

interface PrefectureContextType {
  selectedPrefecture: Prefecture;
  setSelectedPrefecture: React.Dispatch<React.SetStateAction<Prefecture>>;
}

const PrefectureContext = createContext<PrefectureContextType | null>(null);

export const PrefectureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPrefecture, setSelectedPrefecture] = useState<Prefecture>({
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

// ここを修正：nullチェックを追加
export const usePrefecture = () => {
  const context = useContext(PrefectureContext);
  if (!context) {
    throw new Error('usePrefecture must be used within a PrefectureProvider');
  }
  return context; // ここで TypeScript は context が確実に PrefectureContextType だと判断します
};