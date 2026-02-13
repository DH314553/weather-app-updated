import { WeatherResponse } from '../types/weather';
import { City } from '../City';

const areaKanjiToRomaji = {
  '北海道内市町村': { region_id: [22], region_name: 'hokkaido', region_code: [79] },
  '青森県内市町村': { region_id: [23], region_name: 'touhoku', region_code: [80] },
  '岩手県内市町村': { region_id: [24], region_name: 'touhoku', region_code: [80] },
  '宮城県内市町村': { region_id: [25], region_name: 'touhoku', region_code: [80] },
  '秋田県内市町村': { region_id: [26], region_name: 'touhoku', region_code: [80] },
  '山形県内市町村': { region_id: [27], region_name: 'touhoku', region_code: [80] },
  '福島県内市町村': { region_id: [28], region_name: 'touhoku', region_code: [80] },
  '茨城県内市町村': { region_id: [29], region_name: 'kantou', region_code: [81] },
  '栃木県内市町': { region_id: [30], region_name: 'kantou', region_code: [81] },
  '群馬県内市町村': { region_id: [31], region_name: 'kantou', region_code: [81] },
  '埼玉県内市町村': { region_id: [32], region_name: 'kantou', region_code: [81] },
  '千葉県内市町村': { region_id: [33], region_name: 'kantou', region_code: [81] },
  '東京都内市町村': { region_id: [34], region_name: 'kantou', region_code: [81] },
  '神奈川県内市町村': { region_id: [35], region_name: 'kantou', region_code: [81] },
  '新潟県内市町村': { region_id: [36], region_name: 'tyuubu', region_code: [82] },
  '富山県内市町村': { region_id: [37], region_name: 'tyuubu', region_code: [82] },
  '石川県内市町': { region_id: [38], region_name: 'tyuubu', region_code: [82] },
  '福井県内市町': { region_id: [39], region_name: 'tyuubu', region_code: [82] },
  '山梨県内市町村': { region_id: [40], region_name: 'tyuubu', region_code: [82] },
  '長野県内市町村': { region_id: [41], region_name: 'tyuubu', region_code: [82] },
  '岐阜県内市町村': { region_id: [42], region_name: 'tyuubu', region_code: [82] },
  '静岡県内市町': { region_id: [43], region_name: 'tyuubu', region_code: [82] },
  '愛知県内市町村': { region_id: [44], region_name: 'tyuubu', region_code: [82] },
  '三重県内市町': { region_id: [45], region_name: 'kinki', region_code: [83] },
  '滋賀県内市町': { region_id: [46], region_name: 'kinki', region_code: [83] },
  '京都府内市町村': { region_id: [47], region_name: 'kinki', region_code: [83] },
  '大阪府内市町村': { region_id: [48], region_name: 'kinki', region_code: [83] },
  '兵庫県内市町': { region_id: [49], region_name: 'kinki', region_code: [83] },
  '奈良県内市町村': { region_id: [50], region_name: 'kinki', region_code: [83] },
  '和歌山県内市町村': { region_id: [51], region_name: 'kinki', region_code: [83] },
  '鳥取県内市町村': { region_id: [52], region_name: 'chugoku', region_code: [84] },
  '島根県内市町村': { region_id: [53], region_name: 'chugoku', region_code: [84] },
  '岡山県内市町村': { region_id: [54], region_name: 'chugoku', region_code: [84] },
  '広島県内市町': { region_id: [55], region_name: 'chugoku', region_code: [84] },
  '山口県内市町': { region_id: [56], region_name: 'chugoku', region_code: [84] },
  '徳島県内市町村': { region_id: [57], region_name: 'shikoku', region_code: [85] },
  '香川県内市町': { region_id: [58], region_name: 'shikoku', region_code: [85] },
  '愛媛県内市町': { region_id: [59], region_name: 'shikoku', region_code: [85] },
  '高知県内市町村': { region_id: [60], region_name: 'shikoku', region_code: [85] },
  '福岡県内市町村': { region_id: [61], region_name: 'kyuusyuu', region_code: [87] },
  '佐賀県内市町': { region_id: [62], region_name: 'kyuusyuu', region_code: [87] },
  '長崎県内市町': { region_id: [63], region_name: 'kyuusyuu', region_code: [87] },
  '熊本県内市町村': { region_id: [64], region_name: 'kyuusyuu', region_code: [87] },
  '大分県内市町村': { region_id: [65], region_name: 'kyuusyuu', region_code: [87] },
  '宮崎県内市町村': { region_id: [66], region_name: 'kyuusyuu', region_code: [87] },
  '鹿児島県内市町村': { region_id: [67], region_name: 'kyuusyuu', region_code: [87] },
  '沖縄県内市町村': { region_id: [68], region_name: 'kyuusyuu', region_code: [87] }
};


const transformPrefecture = (prefecture: string) => {
  // ローマ字→日本語都道府県名マップ
  const romajiToKanji: { [key: string]: string } = {
    'Hokkaido': '北海道', 'Aomori': '青森県', 'Iwate': '岩手県', 'Miyagi': '宮城県', 'Akita': '秋田県',
    'Yamagata': '山形県', 'Fukushima': '福島県', 'Ibaraki': '茨城県', 'Tochigi': '栃木県', 'Gunma': '群馬県',
    'Saitama': '埼玉県', 'Chiba': '千葉県', 'Tokyo': '東京都', 'Kanagawa': '神奈川県', 'Niigata': '新潟県',
    'Toyama': '富山県', 'Ishikawa': '石川県', 'Fukui': '福井県', 'Yamanashi': '山梨県', 'Nagano': '長野県',
    'Gifu': '岐阜県', 'Shizuoka': '静岡県', 'Aichi': '愛知県', 'Mie': '三重県', 'Shiga': '滋賀県',
    'Kyoto': '京都府', 'Osaka': '大阪府', 'Hyogo': '兵庫県', 'Nara': '奈良県', 'Wakayama': '和歌山県',
    'Tottori': '鳥取県', 'Shimane': '島根県', 'Okayama': '岡山県', 'Hiroshima': '広島県', 'Yamaguchi': '山口県',
    'Tokushima': '徳島県', 'Kagawa': '香川県', 'Ehime': '愛媛県', 'Kochi': '高知県', 'Fukuoka': '福岡県',
    'Saga': '佐賀県', 'Nagasaki': '長崎県', 'Kumamoto': '熊本県', 'Oita': '大分県', 'Miyazaki': '宮崎県',
    'Kagoshima': '鹿児島県', 'Okinawa': '沖縄県'
  };
  // areaKanjiToRomajiのキーに必ず一致するように正規化
  const specialMap: { [key: string]: string } = {
    '栃木県': '栃木県内市町',
    '石川県': '石川県内市町',
    '福井県': '福井県内市町',
    '静岡県': '静岡県内市町',
    '三重県': '三重県内市町',
    '滋賀県': '滋賀県内市町',
    '広島県': '広島県内市町',
    '山口県': '山口県内市町',
    '香川県': '香川県内市町',
    '愛媛県': '愛媛県内市町',
    '佐賀県': '佐賀県内市町',
    '長崎県': '長崎県内市町',
    '兵庫県': '兵庫県内市町',
  };
  let pref = prefecture;
  if (romajiToKanji[prefecture]) pref = romajiToKanji[prefecture];
  if (specialMap[pref]) return specialMap[pref];
  if (pref.endsWith('県')) return pref.replace('県', '県内市町村');
  if (pref.endsWith('道')) return pref.replace('道', '道内市町村');
  if (pref.endsWith('府')) return pref.replace('府', '府内市町村');
  if (pref.endsWith('都')) return pref.replace('都', '都内市町村');
  return pref;
};

/* =========================================================
   ✅ 簡易メモリキャッシュ（座標API制限回避）
========================================================= */
const coordinateCache: Record<string, { lat: string; lon: string }> = {};

/* =========================================================
   天気取得（安定版）
========================================================= */
export const fetchWeatherData = async (latitude: string, longitude: string): Promise<WeatherResponse> => {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,wind_speed_10m,precipitation_probability,relative_humidity_2m,temperature_80m,weather_code&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=Asia%2FTokyo`
  );
  return response.json();
};

export const fetchCoordinates = async (city: string): Promise<{ lat: string, lon: string }> => {
  // 1. キャッシュチェック
  if (coordinateCache[city]) {
    return coordinateCache[city];
  }

  // 地名を正規化（市・町・村を除去）
  const normalizedJapaneseCity = normalizeCityName(city);

  // ローマ字に変換 (例: "札幌" -> "sapporo")
  const romanizedCity = toRomaji(normalizedJapaneseCity);

  // URLエンコードを施してリクエスト
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(romanizedCity)}&count=1&language=en&format=json`;

  try {
    console.log(`Fetching coordinates for: ${romanizedCity} (${city})`);
    const response = await fetch(url);

    if (!response.ok) throw new Error(`Status: ${response.status}`);

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      // ローマ字でダメなら日本語で再試行するフォールバックを入れるとより親切です
      throw new Error(`No coordinates found for: ${city}`);
    }

    const result = {
      lat: data.results[0].latitude.toString(),
      lon: data.results[0].longitude.toString(),
    };

    coordinateCache[city] = result;
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw new Error('座標の取得に失敗しました。');
  }
};

/**
 * ひらがな・カタカナをローマ字（ヘボン式）に変換する簡易関数
 */
function toRomaji(str: string): string {
  const kanaMap: { [key: string]: string } = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'o', 'ん': 'n', 'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    // 必要に応じて 濁点・半濁点などを追加
  };
  // 1. カタカナをひらがなに変換
  let text = kana.replace(/[\u30a1-\u30f6]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );

  // 2. 「っ」の処理（後ろの文字の子音を重ねる）
  // 例: 「さっぽろ」 -> s + sapporo
  text = text.replace(/っ([あ-んa-z])/g, (match, nextChar) => {
    const nextRomaji = kanaMap[nextChar] || nextChar;
    return nextRomaji.charAt(0) + nextRomaji;
  });

  // 3. 特殊な濁点・結合文字の個別置換
  const specials: { [key: string]: string } = {
    'ゅ゙': 'yu', // 濁点付きなどは標準音へ
    'ゔ': 'vu',
    'ー': '',    // 長音記号は検索に不要なので消す
  };

  // 4. 1文字ずつ変換
  return text.split('').map(char => {
    if (specials[char]) return specials[char];
    return kanaMap[char] || char;
  }).join('');
}

/**
 * 住所文字列から市区町村名のみを抽出し、末尾の接尾辞を削除する
 * 例: "札幌市北区" -> "札幌"
 * 例: "余市町" -> "余市"
 */
function normalizeCityName(city: string): string {
  if (!city) return '';

  const cityMatch = city.match(/(.+?)し/);
  if (cityMatch) {
    return cityMatch[1];
  }

  return city.replace(/(く|まち|ちょう|むら|そん)$/, '');
}

export const getRegionInfo = (prefectureName: string) => {
  const regionIds: number[] = [];
  const regionCodes: number[] = [];
  const regionNames: string[] = [];
  for (const [key, value] of Object.entries(areaKanjiToRomaji)) {
    if (key.includes(prefectureName)) {
      regionIds.push(value.region_id[0]);
      regionCodes.push(value.region_code[0]);
      regionNames.push(value.region_name);
    }
  }
  if (regionIds.length && regionCodes.length && regionNames.length) {
    return { regionIds, regionCodes, regionNames };
  } else {
    return { regionIds: null, regionCodes: null, regionNames: null };
  }
}

/* =========================================================
   市区町村取得（安全版）
========================================================= */
export const fetchMunicipalities = async (
  selectedPrefecture: string
): Promise<{
  municipalities: string[];
  selectedMunicipality: string | null;
  error: string | null;
}> => {
  try {
    const city = new City(selectedPrefecture);
    const regionInfo = getRegionInfo(
      transformPrefecture(selectedPrefecture)
    );

    if (
      !regionInfo.regionIds ||
      !regionInfo.regionCodes ||
      !regionInfo.regionNames
    ) {
      throw new Error('Invalid prefecture for municipalities');
    }

    const fetchedMunicipalities =
      await city.getMunicipalities(regionInfo.regionNames.toString(), selectedPrefecture, regionInfo.regionIds, regionInfo.regionCodes);

    const municipalities = Array.isArray(fetchedMunicipalities)
      ? fetchedMunicipalities
      : [];

    return {
      municipalities,
      selectedMunicipality:
        municipalities.length > 0 ? municipalities[0] : null,
      error: null,
    };
  } catch (err) {
    console.error(err);
    return {
      municipalities: [],
      selectedMunicipality: null,
      error: '市区町村の取得に失敗しました',
    };
  }
};

/* =========================================================
   天候判定（軽量化）
========================================================= */
export const predictWeather = (
  weatherCode: number,
  temperature: number,
  precipitation: number,
  windSpeed: number
): string => {
  if (temperature <= 0 && precipitation > 50) return '大雪';
  if (precipitation > 60) return '大雨';
  if (windSpeed > 25) return '暴風';

  switch (weatherCode) {
    case 0:
      return '晴れ';
    case 1:
    case 2:
    case 3:
      return '曇り';
    case 61:
    case 63:
    case 65:
      return '雨';
    case 71:
    case 73:
    case 75:
      return '雪';
    case 95:
      return '雷雨';
    default:
      return '晴れ';
  }
};
