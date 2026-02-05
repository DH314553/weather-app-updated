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

export const fetchWeatherData = async (latitude: string, longitude: string): Promise<WeatherResponse> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,rain,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&wind_speed_unit=ms&timezone=Asia%2FTokyo`;
    
    console.log(`Fetching weather data from: ${url.substring(0, 100)}...`);
    
    const response = await fetch(url);

    console.log(`Weather API response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Weather API error response: ${errorText}`);
      throw new Error(`Weather API error: Status ${response.status} - ${errorText || response.statusText}`);
    }

    const data = await response.json();
    
    console.log('Weather data received:', Object.keys(data));
    
    if (!data || !data.current || !data.hourly || !data.daily) {
      console.error('Missing required fields:', { 
        hasCurrent: !!data?.current, 
        hasHourly: !!data?.hourly, 
        hasDaily: !!data?.daily 
      });
      throw new Error('Invalid weather data structure from API');
    }

    return data as WeatherResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('fetchWeatherData error:', errorMessage);
    throw new Error(`天気データの取得に失敗しました: ${errorMessage}`);
  }
};

export const fetchCoordinates = async (city: string): Promise<{ lat: string, lon: string }> => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`;

  try {
    console.log(`Fetching coordinates for city: ${city}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'weatherApp/1.0 (daisaku.another31469@gmail.com)',
      },
    });

    const textResponse = await response.text(); // JSONでなくてもエラーメッセージを取得できる

    if (!response.ok) {
      console.error(`Error response: ${textResponse}`);
      throw new Error(`Failed to fetch coordinates: ${response.statusText}`);
    }

    try {
      const data = JSON.parse(textResponse);
      if (data.length === 0) {
        throw new Error(`No coordinates found for city: ${city}`);
      }
      return { lat: data[0].lat, lon: data[0].lon };
    } catch (parseError) {
      console.error(`JSON parsing error: ${textResponse}`);
      throw new Error('Received non-JSON response from the API');
    }
  } catch (error) {
    console.error('Error fetching coordinates:', error);
    throw new Error('Unable to fetch coordinates. Please try again later.');
  }
};

const transformPrefecture = (prefecture: string) => {
    if (prefecture.includes('県')) {
      if (['栃木', '石川', '福井', '静岡', '三重', '滋賀', '広島', '山口', '香川', '愛媛', '佐賀', '長崎'].some(substring => prefecture.includes(substring))) {
        return prefecture.replace('県', '県内市町');
      }
      return prefecture.replace('県', '県内市町村');
    } else if (prefecture.includes('道')) {
      return prefecture.replace('道', '道内市町村');
    } else if (prefecture.includes('府')) {
      return prefecture.replace('府', '府内市町村');
    } else if (prefecture.includes('都')) {
      return prefecture.replace('都', '都内市町村');
    } else {
      return prefecture;
    }
};

const getRegionInfo = (prefectureName: string) => {
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

export const fetchMunicipalities = async (selectedPrefecture: string): Promise<{ municipalities: string[], selectedMunicipality: string | null, error: string | null }> => {
  try {
    console.log('fetchMunicipalities called with:', selectedPrefecture);
    
    const city = new City(selectedPrefecture);
    const transformedPrefecture = transformPrefecture(selectedPrefecture);
    console.log('Transformed Prefecture:', transformedPrefecture);
    
    const { regionIds, regionCodes, regionNames } = getRegionInfo(transformedPrefecture);
    console.log('Region Info:', { regionIds, regionCodes, regionNames });

    if (regionNames && regionIds && regionCodes) {
      console.log('Fetching municipalities with params:', { regionNames: regionNames.toString(), selectedPrefecture, regionIds, regionCodes });
      
      const fetchedMunicipalities = await city.getMunicipalities(regionNames.toString(), selectedPrefecture, regionIds, regionCodes);
      console.log('Fetched Municipalities:', fetchedMunicipalities);
      console.log('Fetched Municipalities type:', typeof fetchedMunicipalities, Array.isArray(fetchedMunicipalities));
      
      // API から取得された市区町村リストをそのまま使用（フィルタリング不要）
      const municipalities = Array.isArray(fetchedMunicipalities) ? fetchedMunicipalities : [];
      console.log('Municipalities:', municipalities);
      
      const selectedMunicipality = municipalities.length > 0 ? municipalities[0] : null;
      console.log('Selected Municipality:', selectedMunicipality);

      return {
        municipalities: municipalities,
        selectedMunicipality: selectedMunicipality,
        error: null
      };
    } else {
      console.error('Region info is null');
      return {
        municipalities: [],
        selectedMunicipality: null,
        error: '市区町村の取得に失敗しました',
      };
    }
  } catch (err) {
    console.error('fetchMunicipalities error:', err);
    return {
      municipalities: [],
      selectedMunicipality: null,
      error: '市区町村の取得に失敗しました',
    };
  }
};

export const predictWeather = (
  weatherCode: number,
  temperature: number,
  precipitation: number,
  humidity: number,
  windSpeed: number,
  weatherData: number[][],
  threshold: number
): string => {
  // 強風・暴風の基準 (風速 m/s)
  const strongWindThreshold = 15;
  const stormWindThreshold = 25;

  // リッジ検出による天候判定
  const ridgeDetected = ridgeDetection(weatherData, threshold);

  // 雪の条件
  if (temperature <= 0 && precipitation >= 50 && windSpeed >= stormWindThreshold) {
    return '暴風雪';
  }
  if (temperature <= 0 && precipitation >= 30 && windSpeed >= strongWindThreshold) {
    return '吹雪';
  }
  if (temperature <= 0 && precipitation >= 30) {
    return '大雪';
  }
  if (temperature < 0 && precipitation > 0) {
    return '雪';
  }

  // 雨の条件
  if (precipitation > 80 && windSpeed >= stormWindThreshold) {
    return '暴風雨';
  }
  if (precipitation > 60 && windSpeed >= strongWindThreshold) {
    return '強風を伴う大雨';
  }
  if (precipitation > 60) {
    return '大雨';
  }
  if (precipitation >= 30 && precipitation <= 50) {
    return '小雨';
  }
  if (precipitation >= 10 && precipitation <= 30) {
    return '通り雨';
  }

  // 風の条件
  if (windSpeed >= stormWindThreshold) {
    return '暴風';
  }
  if (windSpeed >= strongWindThreshold) {
    return '強風';
  }

  if (ridgeDetected && weatherCode === 1) {
    return '曇り';
  } else if (ridgeDetected && weatherCode === 0) {
    return '晴れ';
  } else if (ridgeDetected && weatherCode === 2) {
    return '曇り';
  } else if (ridgeDetected && weatherCode === 3) {
    return '曇り';
  } else if (ridgeDetected && weatherCode === 61) {
    return '雨';
  } else if (ridgeDetected && weatherCode === 63) {
    return '雨';
  } else if (ridgeDetected && weatherCode === 65) {
    return '雨';
  }

  // WMO Weather interpretation codes (WW)
  switch (weatherCode) {
    case 0:
      return '晴れ';
    case 1:
    case 2:
    case 3:
      return '曇り';
    case 45:
    case 48:
      return '霧';
    case 51:
    case 53:
    case 55:
      return '小雨';
    case 61:
    case 63:
    case 65:
      return '雨';
    case 71:
    case 73:
    case 75:
      return '雪';
    case 77:
      return '霧雪';
    case 80:
    case 81:
    case 82:
      return 'にわか雨';
    case 85:
    case 86:
      return 'にわか雪';
    case 95:
      return '雷雨';
    case 96:
    case 99:
      return '雷を伴う雹';
    default:
      return '晴れ';
  }
};

export const ridgeDetection = (data: number[][], threshold: number): boolean => {
  const rows = data.length;
  const cols = data[0].length;
  let count = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 1; i < rows - 1; i++) {
    for (let j = 1; j < cols - 1; j++) {
      if (data[i][j] > threshold && !isNaN(data[i][j])) {
        let step_i = i;
        let step_j = j;

        for (let k = 0; k < 1000; k++) {
          if (step_i === 0 || step_j === 0 || step_i === rows - 1 || step_j === cols - 1) {
            break;
          }

          let index = 4;
          let vmax = -Infinity;
          for (let ii = -1; ii <= 1; ii++) {
            for (let jj = -1; jj <= 1; jj++) {
              const value = data[step_i + ii][step_j + jj];
              if (value > vmax) {
                vmax = value;
                index = (ii + 1) * 3 + (jj + 1);
              }
            }
          }

          if (index === 4 || vmax === data[step_i][step_j] || isNaN(vmax)) {
            break;
          }

          const row = Math.floor(index / 3) - 1;
          const col = (index % 3) - 1;
          count[step_i + row][step_j + col] += 1;
          step_i += row;
          step_j += col;
        }
      }
    }
  }

  const weatherNormalized = data.flat().reduce((sum, val) => sum + val, 0) / (rows * cols);
  return weatherNormalized > threshold;
};