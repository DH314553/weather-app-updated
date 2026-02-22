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
  '鳥取県内市町村': { region_id: [52], region_name: 'chuugoku', region_code: [84] },
  '島根県内市町村': { region_id: [53], region_name: 'chuugoku', region_code: [84] },
  '岡山県内市町村': { region_id: [54], region_name: 'chuugoku', region_code: [84] },
  '広島県内市町': { region_id: [55], region_name: 'chuugoku', region_code: [84] },
  '山口県内市町': { region_id: [56], region_name: 'chuugoku', region_code: [84] },
  '徳島県内市町村': { region_id: [57], region_name: 'shikoku', region_code: [86] },
  '香川県内市町': { region_id: [58], region_name: 'shikoku', region_code: [86] },
  '愛媛県内市町': { region_id: [59], region_name: 'shikoku', region_code: [86] },
  '高知県内市町村': { region_id: [60], region_name: 'shikoku', region_code: [86] },
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
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,wind_speed_10m,precipitation_probability,relative_humidity_2m,temperature_80m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=Asia%2FTokyo`
  );
  return response.json();
};

// Prefecture name romanization mapping
const prefectureRomajiMap: { [key: string]: string } = {
  '北海道': 'hokkaido',
  '青森県': 'aomori',
  '岩手県': 'iwate',
  '宮城県': 'miyagi',
  '秋田県': 'akita',
  '山形県': 'yamagata',
  '福島県': 'fukushima',
  '茨城県': 'ibaraki',
  '栃木県': 'tochigi',
  '群馬県': 'gunma',
  '埼玉県': 'saitama',
  '千葉県': 'chiba',
  '東京都': 'tokyo',
  '神奈川県': 'kanagawa',
  '新潟県': 'niigata',
  '富山県': 'toyama',
  '石川県': 'ishikawa',
  '福井県': 'fukui',
  '山梨県': 'yamanashi',
  '長野県': 'nagano',
  '岐阜県': 'gifu',
  '静岡県': 'shizuoka',
  '愛知県': 'aichi',
  '三重県': 'mie',
  '滋賀県': 'shiga',
  '京都府': 'kyoto',
  '大阪府': 'osaka',
  '兵庫県': 'hyogo',
  '奈良県': 'nara',
  '和歌山県': 'wakayama',
  '鳥取県': 'tottori',
  '島根県': 'shimane',
  '岡山県': 'okayama',
  '広島県': 'hiroshima',
  '山口県': 'yamaguchi',
  '徳島県': 'tokushima',
  '香川県': 'kagawa',
  '愛媛県': 'ehime',
  '高知県': 'kochi',
  '福岡県': 'fukuoka',
  '佐賀県': 'saga',
  '長崎県': 'nagasaki',
  '熊本県': 'kumamoto',
  '大分県': 'oita',
  '宮崎県': 'miyazaki',
  '鹿児島県': 'kagoshima',
  '沖縄県': 'okinawa'
};

export const fetchCoordinates = async (
  city: string,
  worldFlag: boolean = false,
  prefectureName?: string,
  prefectureCoords?: { lat: string; lng?: string; lon?: string }
): Promise<{ lat: string, lon: string }> => {
  // 1. 正規化（市区→市, 東京都の区→東京23区）とキャッシュチェック
  let normalizedCity = city;
  try {
    if (normalizedCity.includes('市') && normalizedCity.includes('区')) {
      normalizedCity = normalizedCity.substring(0, normalizedCity.indexOf('市') + 1);
    } else if (prefectureName && prefectureName.includes('東京') && normalizedCity.includes('区')) {
      normalizedCity = '東京23区';
    }
  } catch (e) {
    normalizedCity = city;
  }

  if (coordinateCache[normalizedCity]) {
    return coordinateCache[normalizedCity];
  }

  // // タイムアウト付きフェッチ関数（高速化）
  // const fetchWithTimeout = async (url: string, timeoutMs: number = 4000) => {
  //   const controller = new AbortController();
  //   const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  //   try {
  //     const response = await fetch(url, { signal: controller.signal });
  //     clearTimeout(timeoutId);
  //     return response;
  //   } catch (error) {
  //     clearTimeout(timeoutId);
  //     throw error;
  //   }
  // };

  // 並列API検索関数 — 最初に成功した結果を採用し、他を中断する
  const searchCoordinates = async (cityRomaji: string, prefRomaji: string | null, prefectureName: string | undefined): Promise<any> => {
    const controllers: AbortController[] = [];
    const timeoutMs = 20000;

    const makeFetchPromise = (url: string, parser: (d: any) => boolean, source: string) => {
      return new Promise(async (resolve, reject) => {
        const controller = new AbortController();
        controllers.push(controller);
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!res.ok) return reject(new Error('bad status'));
          const data = await res.json();
          if (!parser(data)) return reject(new Error('no results'));
          resolve({ source, data });
        } catch (err) {
          clearTimeout(timeoutId);
          reject(err);
        }
      });
    };

    const promises: Promise<any>[] = [];

    const url1 = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityRomaji)}&count=10&language=en&format=json&countryCode=JP`;
    promises.push(makeFetchPromise(url1, (d) => d && d.results && d.results.length > 0, 'openmeteo1'));

    if (prefRomaji) {
      const url2 = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(`${cityRomaji},${prefRomaji}`)}&count=10&language=en&format=json&countryCode=JP`;
      promises.push(makeFetchPromise(url2, (d) => d && d.results && d.results.length > 0, 'openmeteo2'));
    }

    const nominatimQuery = prefRomaji ? `${cityRomaji}, ${prefectureName}, Japan` : `${cityRomaji}, Japan`;
    const urlN = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(nominatimQuery)}&format=json&countrycodes=jp&limit=5`;
    promises.push(makeFetchPromise(urlN, (d) => Array.isArray(d) && d.length > 0, 'nominatim'));

    try {
      // Promise.any は最初に成功した promise を返す（全て失敗すると reject）
      const winner = await Promise.any(promises);
      // 成功したら他のリクエストを中止
      controllers.forEach((c) => c.abort());
      return winner;
    } catch (e) {
      // 全て失敗
      controllers.forEach((c) => c.abort());
      return null;
    }
  };

  try {
    let url: string;
    let data: any;

    if (worldFlag) {
      // 世界の都市はローマ字に変換して検索
      const cityRomaji = toRomaji(city);
      url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityRomaji)}&count=10&language=en&format=json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      data = await response.json();
    } else {
      // 日本国内の市町村はローマ字に変換して検索
        // 正規化: 「○市○区」は「○市」にまとめ、東京都の区は全て「東京23区」にまとめる
        let normalizedCity = city;
        try {
          if (normalizedCity.includes('市') && normalizedCity.includes('区')) {
            normalizedCity = normalizedCity.substring(0, normalizedCity.indexOf('市') + 1);
          } else if (prefectureName && prefectureName.includes('東京') && normalizedCity.includes('区')) {
            normalizedCity = '東京23区';
          }
        } catch (e) {
          // 正規化失敗時は元のcityを使用
          normalizedCity = city;
        }

        // 検索用のローマ字（東京都23区は'tokyo'にマップ）
        let cityRomaji: string;
        if (normalizedCity === '東京23区') {
          cityRomaji = 'tokyo';
        } else {
          cityRomaji = toRomaji(normalizedCity);
        }
        const prefRomaji = prefectureName ? prefectureRomajiMap[prefectureName] : null;

        console.log(`🔍 Searching for: ${city} -> normalized: ${normalizedCity} -> ${cityRomaji} (pref: ${prefectureName})`);

        // 並列でAPI検索を実行
        const searchResult = await searchCoordinates(cityRomaji, prefRomaji, prefectureName);

      if (searchResult) {
        console.log(`✅ ${searchResult.source} success for: ${city}`);
        if (searchResult.source === 'nominatim') {
          // Nominatimの結果を使用
          const result = {
            lat: searchResult.data[0].lat,
            lon: searchResult.data[0].lon,
          };
          coordinateCache[normalizedCity] = result;
          return result;
        } else {
          // Open-Meteoの結果を使用
          const result = {
            lat: searchResult.data.results[0].latitude.toString(),
            lon: searchResult.data.results[0].longitude.toString(),
          };
          coordinateCache[normalizedCity] = result;
          return result;
        }
      }

      // 全てのAPIが失敗した場合
      console.log(`❌ All APIs failed for: ${city}`);
    }

    if (!data.results || data.results.length === 0) {
      // 日本国内で座標取得に失敗した場合、都道府県のフォールバック座標を使用
      if (!worldFlag && prefectureCoords) {
        console.log(`⚠️  Falling back to prefecture coordinates for: ${city}`);
        const fallbackResult = {
          lat: prefectureCoords.lat,
          lon: prefectureCoords.lon || prefectureCoords.lng || '',
        };
        coordinateCache[normalizedCity] = fallbackResult;
        return fallbackResult;
      }
      throw new Error(`No coordinates found for: ${city}`);
    }

    const result = {
      lat: data.results[0].latitude.toString(),
      lon: data.results[0].longitude.toString(),
    };

    coordinateCache[normalizedCity] = result;
    return result;
  } catch (error) {
    // 日本国内検索で失敗した場合、都道府県座標をフォールバック
    if (!worldFlag && prefectureCoords) {
      console.log(`⚠️  Error, using prefecture fallback for: ${city}`);
      return {
        lat: prefectureCoords.lat,
        lon: prefectureCoords.lon || prefectureCoords.lng || '',
      };
    }

    console.error(`❌ Coordinates Error [${city}]:`, error);
    throw new Error(`座標の取得に失敗しました: ${city}`);
  }
};

/**
 * ひらがな・カタカナをローマ字（ヘボン式）に変換する関数
 * 市町村検索の座標取得用
 */
function toRomaji(str: string): string {
  if (!str) return "";
  let text = str.trim();

  // 1. カタカナをひらがなに正規化
  text = text.replace(/[\u30a1-\u30f6]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0x60));

  // 2. 行政単位（区、市、町、村、ちょう、むら、し、く）の削除
  // 漢字とひらがなの両方の行政単位に対応
  text = text.replace(/([区市町村]|ちょう|まち|そん|むら|し|く)$/, "");

  // 3. ひらがなをローマ字に変換
  const kanaMap: { [key: string]: string } = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'n',
    // 小書き文字
    'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o',
    'ゃ': 'ya', 'ゅ': 'yu', 'ょ': 'yo', 'ゎ': 'wa',
    // 2文字の組み合わせ
    'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
    'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
    'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
    'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
    'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
    'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
    'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
    'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
    'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
    'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
    'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo'
  };

  let result = "";
  let i = 0;
  while (i < text.length) {
    const char2 = text.substring(i, i + 2);
    const char1 = text.substring(i, i + 1);

    // 2文字の組み合わせを優先
    if (kanaMap[char2]) {
      result += kanaMap[char2];
      i += 2;
    } else if (char1 === 'っ') {
      // 促音：次の文字の最初の子音を重ねる
      const next = text.substring(i + 1, i + 2);
      if (kanaMap[next]) {
        const nextRomaji = kanaMap[next];
        result += nextRomaji[0];
      }
      i += 1;
    } else if (kanaMap[char1]) {
      result += kanaMap[char1];
      i += 1;
    } else {
      result += char1;
      i += 1;
    }
  }

  // 4. 長音の処理（順序が重要）
  result = result
    // まず特殊な長音を処理
    .replace(/yuu/g, 'yu')
    .replace(/yoo/g, 'yo')
    .replace(/yuu/g, 'yu') // 念のため
    .replace(/ryuu/g, 'ryu')
    .replace(/ryoo/g, 'ryo')
    .replace(/myuu/g, 'myu')
    .replace(/myoo/g, 'myo')
    .replace(/hyuu/g, 'hyu')
    .replace(/hyoo/g, 'hyo')
    .replace(/nyuu/g, 'nyu')
    .replace(/nyoo/g, 'nyo')
    .replace(/chuu/g, 'chu')
    .replace(/choo/g, 'cho')
    .replace(/shuu/g, 'shu')
    .replace(/shoo/g, 'sho')
    .replace(/juu/g, 'ju')
    .replace(/joo/g, 'jo')
    .replace(/kyuu/g, 'kyu')
    .replace(/kyoo/g, 'kyo')
    .replace(/gyuu/g, 'gyu')
    .replace(/gyoo/g, 'gyo')
    .replace(/byuu/g, 'byu')
    .replace(/byoo/g, 'byo')
    .replace(/pyuu/g, 'pyu')
    .replace(/pyoo/g, 'pyo')
    // 次に一般的な長音
    .replace(/ou/g, 'o')
    .replace(/uu/g, 'u')
    .replace(/oo/g, 'o')
    .replace(/ei/g, 'ei') // 例外
    .toLowerCase()
    .trim();

  return result;
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
  // 優先ルール
  if (windSpeed >= 25) return '暴風';
  if (temperature <= 0 && precipitation > 50) return '大雪';
  if (precipitation > 80) return '大雨';

  // Open-Meteo / WMO weather codes
  switch (weatherCode) {
    case 0:
      return '晴れ';
    case 1:
      return '晴れ時々曇り';
    case 2:
      return '曇り';
    case 3:
      return '厚い雲';
    case 45:
    case 48:
      return '霧';
    case 51:
    case 53:
    case 55:
      return '霧雨';
    case 56:
    case 57:
      return 'みぞれ';
    case 61:
    case 63:
    case 65:
      return '雨';
    case 66:
    case 67:
      return 'あられ';
    case 71:
    case 73:
    case 75:
    case 77:
      return '雪';
    case 80:
    case 81:
    case 82:
      return 'にわか雨';
    case 85:
    case 86:
      return 'にわか雪';
    case 95:
    case 96:
    case 99:
      return '雷雨';
    default:
      // どのカテゴリにも当てはまらない場合は降水量で判断
      if (precipitation > 50) return '雨';
      return '晴れ';
  }
};
