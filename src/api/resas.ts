// RESAS APIの代替: ローカルJSONから都道府県データを取得
import prefectures from '../../assets/prefectures.json';

export async function getPrefectures() {
  // 直接JSONデータを返す
  return prefectures;
}

// 市区町村データも必要なら同様にローカルJSON化する
export async function getCities(prefCode: number) {
  // ここでは空配列を返す（必要に応じて拡張）
  return [];
}