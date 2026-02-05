import Constants from "expo-constants";

const API_KEY = Constants.expoConfig?.extra?.resasApiKey;

const headers = {
  "X-API-KEY": API_KEY ?? ""
};

export async function getPrefectures() {
  const res = await fetch("https://opendata.resas-portal.go.jp/api/v1/prefectures", { headers });
  return (await res.json()).result;
}

export async function getCities(prefCode: number) {
  const res = await fetch(`https://opendata.resas-portal.go.jp/api/v1/cities?prefCode=${prefCode}`, { headers });
  return (await res.json()).result;
}