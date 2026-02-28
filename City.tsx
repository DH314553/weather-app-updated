import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export class City {
  prefecture: string;
  private static readonly MUNICIPALITY_DATA_URL =
    process.env.EXPO_PUBLIC_MUNICIPALITY_DATA_URL ||
    'https://raw.githubusercontent.com/piuccio/open-data-jp-municipalities/master/municipalities.json';
  private static municipalityDatasetCache: any[] | null = null;

  constructor(prefecture: string) {
    this.prefecture = prefecture;
  }

  private buildCandidateUrls(targetUrl: string): string[] {
    if (Platform.OS !== 'web') return [targetUrl];

    const candidates: string[] = [];
    const encodedTargetUrl = encodeURIComponent(targetUrl);
    // const host = typeof window !== 'undefined' ? window.location.hostname : '';
    // const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    // const useLocalProxy = process.env.EXPO_PUBLIC_USE_LOCAL_PROXY !== '0';
    // const tryDirectWebFetch = process.env.EXPO_PUBLIC_TRY_DIRECT_WEB_FETCH === '1';

    // // 0) 直接アクセス（CORSエラーを避けるため既定で無効。必要時のみENVで有効化）
    // if (tryDirectWebFetch) {
    //   candidates.push(targetUrl);
    // }

    // // 1) 明示設定されたプロキシ
    // const envBase = process.env.EXPO_PUBLIC_PROXY_BASE?.replace(/\/$/, '');
    // if (envBase) candidates.push(`${envBase}/proxy?url=${encodedTargetUrl}`);

    // // 2) 同一オリジン配下のAPI（本番/Vercel想定）
    // if (typeof window !== 'undefined') {
    //   candidates.push(`${window.location.origin}/api/proxy?url=${encodedTargetUrl}`);
    //   candidates.push(`${window.location.origin}/proxy?url=${encodedTargetUrl}`);
    // }

    // // 3) ローカル開発用のExpressプロキシ（必要時のみ明示的に有効化）
    // if (typeof window !== 'undefined') {
    //   if (useLocalProxy && isLocalhost) {
    //     candidates.push(`http://localhost:3000/proxy?url=${encodedTargetUrl}`);
    //     candidates.push(`http://127.0.0.1:3000/proxy?url=${encodedTargetUrl}`);
    //   }
    // }

    // 4) 公開CORSプロキシ（不安定なので必要時のみ有効化）
    if (process.env.EXPO_PUBLIC_USE_PUBLIC_PROXY === '1') {
      candidates.push(`https://api.allorigins.win/raw?url=${encodedTargetUrl}`);
      candidates.push(`https://corsproxy.io/?${targetUrl}`);
    }

    return Array.from(new Set(candidates));
  }

  private async fetchWithTimeout(url: string, timeoutMs = 12000): Promise<Response> {
    // WebでJ-LIS直アクセスするとCORSエラーが必ず発生するため、明示有効時のみ許可
    if (
      Platform.OS === 'web' &&
      /^https:\/\/www\.j-lis\.go\.jp\//.test(url) &&
      process.env.EXPO_PUBLIC_TRY_DIRECT_WEB_FETCH !== '1'
    ) {
      throw new Error('Direct J-LIS fetch blocked on web (CORS). Use proxy candidates.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchMunicipalityHtml(url: string): Promise<string> {
    const candidateUrls = this.buildCandidateUrls(url);
    const attempts: string[] = [];

    for (const candidate of candidateUrls) {
      try {
        const response = await this.fetchWithTimeout(candidate);
        if (!response.ok) {
          attempts.push(`${candidate} -> HTTP ${response.status}`);
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            const json = await response.json();
            const maybeHtml = typeof json?.contents === 'string' ? json.contents : typeof json === 'string' ? json : '';
            if (/<td\b/i.test(maybeHtml)) return maybeHtml;
            attempts.push(`${candidate} -> JSON response without municipality table`);
          } catch (_jsonError) {
            // JSONとして読めないケースは無視して次候補へ
            attempts.push(`${candidate} -> JSON parse failed`);
          }
        } else {
          const text = await response.text();
          if (/<td\b/i.test(text)) return text;
          attempts.push(`${candidate} -> HTML without municipality table`);
        }
      } catch (error) {
        // 次の候補URLで再試行
        const reason = error instanceof Error ? error.message : String(error);
        attempts.push(`${candidate} -> ${reason}`);
      }
    }

    throw new Error(`Failed to fetch municipality HTML from all candidates. Attempts: ${attempts.join(' | ')}`);
  }

  private async fetchMunicipalitiesFromOpenData(prefecture: string): Promise<{ name: string; kana: string }[]> {
    const datasetUrls = Array.from(new Set([
      City.MUNICIPALITY_DATA_URL,
      'https://cdn.jsdelivr.net/gh/piuccio/open-data-jp-municipalities@master/municipalities.json',
    ]));
    const normalize = (v: unknown) => String(v ?? '').trim();
    const prefWithoutSuffix = prefecture.replace(/[都道府県]$/u, '');

    if (!Array.isArray(City.municipalityDatasetCache)) {
      for (const datasetUrl of datasetUrls) {
        try {
          const response = await this.fetchWithTimeout(datasetUrl, 20000);
          if (!response.ok) continue;
          const data = await response.json();
          if (!Array.isArray(data)) continue;
          City.municipalityDatasetCache = data;
          break;
        } catch (_error) {
          // 次のデータセットURLを試す
        }
      }
    }

    const data = City.municipalityDatasetCache;
    if (!Array.isArray(data)) return [];

    const filtered = data.filter((item: any) => {
      const prefKanji = normalize(item?.prefecture_kanji);
      const prefName = normalize(item?.prefecture);
      const prefKanjiBase = prefKanji.replace(/[都道府県]$/u, '');
      const prefNameBase = prefName.replace(/[都道府県]$/u, '');
      return (
        prefKanji === prefecture ||
        prefName === prefecture ||
        prefKanjiBase === prefWithoutSuffix ||
        prefNameBase === prefWithoutSuffix
      );
    });

    const mapped = filtered
      .map((item: any) => ({
        name: normalize(item?.name_kanji || item?.city || item?.name),
        kana: normalize(item?.name_kana || item?.kana || item?.name_kanji || item?.name),
      }))
      .filter((item: { name: string; kana: string }) => item.name.length > 0);

    const uniqueMap = new Map<string, { name: string; kana: string }>();
    for (const item of mapped) {
      if (!uniqueMap.has(item.name)) uniqueMap.set(item.name, item);
    }

    return Array.from(uniqueMap.values());
  }

  async getMunicipalityDetails(blockArea: string, prefecture: string, regionId: number[], regionCode: number[]): Promise<{ name: string; kana: string }[]> {
    const url = `https://www.j-lis.go.jp/spd/code-address/${blockArea}/cms_1${regionId[0]}141${regionCode[0]}.html`;
    const MIN_REASONABLE_COUNT = 3;
    const fallbackToOpenData = async (reason: string) => {
      const fallback = await this.fetchMunicipalitiesFromOpenData(prefecture);
      if (fallback.length > 0) {
        if (process.env.EXPO_PUBLIC_DEBUG_MUNICIPALITY === '1') {
          console.info(`Municipality fallback used (${Platform.OS}): ${prefecture} (${fallback.length}件) - ${reason}`);
        }
        return fallback;
      }
      return [];
    };

    try {
      const textResponse = await this.fetchMunicipalityHtml(url);
  
      // 2. 都道府県のセクション（<h1>）を探す
      const prefecturePattern = new RegExp(`<h1>.*?${prefecture}.*?</h1>`, 'i');
      const prefectureMatch = textResponse.match(prefecturePattern);
  
      if (!prefectureMatch) {
        console.warn('Prefecture section not found.');
        return await fallbackToOpenData('Prefecture section not found in J-LIS HTML');
      }
  
      const prefectureSection = textResponse.substring(prefectureMatch.index! + prefectureMatch[0].length);
  
      // 3. <td> タグの中身を抽出
      const tdPattern = /<td>([\s\S]*?)<\/td>/gi;
      let cells: string[] = [];
      let match;
      while ((match = tdPattern.exec(prefectureSection)) !== null) {
        const content = match[1].replace(/<[^>]*>?/gm, '').trim();
        if (content) cells.push(content);
      }
  
      const results: { name: string; kana: string }[] = [];
      const excludeList = ["都道府県", "市区町村", "所在地", "読みがな", "一番町"];
  
      for (let i = 0; i < cells.length - 1; i++) {
        const nameCandidate = cells[i];
        const kanaCandidate = cells[i + 1];
  
        const isName = /[一-龯ヶ]+(?:市|町|村|区|島)$/.test(nameCandidate);
        const isKana = /^[ぁ-んー]+$/.test(kanaCandidate);
  
        if (isName && isKana && !excludeList.some(ex => nameCandidate.includes(ex))) {
          results.push({ name: nameCandidate, kana: kanaCandidate });
          i++;
        }
      }
  
      const uniqueMap = new Map<string, { name: string; kana: string }>();
      results.forEach(r => uniqueMap.set(r.name, r));
      const parsed = Array.from(uniqueMap.values());
      if (parsed.length >= MIN_REASONABLE_COUNT) return parsed;
      if (parsed.length > 0) {
        const fallback = await fallbackToOpenData(`Suspiciously small J-LIS result (${parsed.length}件)`);
        if (fallback.length > parsed.length) return fallback;
        return parsed;
      }

      return await fallbackToOpenData('No municipalities parsed from J-LIS table');
  
    } catch (error) {
      const fallback = await fallbackToOpenData('J-LIS fetch/parsing error');
      if (fallback.length > 0) return fallback;

      console.error('Failed to fetch municipalities:', error);
      if (Platform.OS === 'web') {
        console.warn('Web fetch failed on all sources. Set EXPO_PUBLIC_PROXY_BASE or EXPO_PUBLIC_MUNICIPALITY_DATA_URL if needed.');
      } else {
        console.warn('Native fetch failed on all sources. Consider setting EXPO_PUBLIC_MUNICIPALITY_DATA_URL to a reachable mirror.');
      }
      return [];
    }
  }

  // --- 共通メソッド ---
  async getMunicipalities(ba: string, pr: string, ri: number[], rc: number[]): Promise<string[]> {
    const details = await this.getMunicipalityDetails(ba, pr, ri, rc);
    return details.map(m => m.name);
  }

  async generateMunicipalityJson(ba: string, pr: string, ri: number[], rc: number[]): Promise<string> {
    const municipalities = await this.getMunicipalityDetails(ba, pr, ri, rc);
    return JSON.stringify({ prefecture: pr, count: municipalities.length, municipalities }, null, 2);
  }

  async saveMunicipalityJson(ba: string, pr: string, ri: number[], rc: number[]): Promise<string | null> {
    try {
      const jsonString = await this.generateMunicipalityJson(ba, pr, ri, rc);
      const fileUri = `${FileSystem.documentDirectory}municipalities_${pr}.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString);
      return fileUri;
    } catch (error) {
      return null;
    }
  }
}   
