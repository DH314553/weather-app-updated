import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export class City {
  prefecture: string;

  constructor(prefecture: string) {
    this.prefecture = prefecture;
  }

  private buildCandidateUrls(targetUrl: string): string[] {
    if (Platform.OS !== 'web') return [targetUrl];

    const candidates: string[] = [];

    // 1) 明示設定されたプロキシ
    const envBase = process.env.EXPO_PUBLIC_PROXY_BASE?.replace(/\/$/, '');
    if (envBase) candidates.push(`${envBase}/proxy?url=${targetUrl}`);

    // 2) 同一オリジン配下のAPI（本番/Vercel想定）
    if (typeof window !== 'undefined') {
      candidates.push(`${window.location.origin}/api/proxy?url=${targetUrl}`);
      candidates.push(`${window.location.origin}/proxy?url=${targetUrl}`);
    }

    // 3) 外部フォールバック
    candidates.push(`https://api.allorigins.win/raw?url=${targetUrl}`);
    candidates.push(`https://corsproxy.io/?${targetUrl}`);

    // 4) ローカル開発用のExpressプロキシ（未起動時のERR_CONNECTION_REFUSEDノイズを減らすため最後に試す）
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        candidates.push(`http://localhost:3000/proxy?url=${targetUrl}`);
        candidates.push(`http://127.0.0.1:3000/proxy?url=${targetUrl}`);
      }
    }

    return Array.from(new Set(candidates));
  }

  private async fetchWithTimeout(url: string, timeoutMs = 12000): Promise<Response> {
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

    for (const candidate of candidateUrls) {
      try {
        const response = await this.fetchWithTimeout(candidate);
        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            const json = await response.json();
            const maybeHtml = typeof json?.contents === 'string' ? json.contents : typeof json === 'string' ? json : '';
            if (maybeHtml.includes('<td>')) return maybeHtml;
          } catch (_jsonError) {
            // JSONとして読めないケースは無視して次候補へ
          }
        } else {
          const text = await response.text();
          if (text.includes('<td>')) return text;
        }
      } catch (_error) {
        // 次の候補URLで再試行
      }
    }

    throw new Error('Failed to fetch municipality HTML from all candidates.');
  }

  async getMunicipalityDetails(blockArea: string, prefecture: string, regionId: number[], regionCode: number[]): Promise<{ name: string; kana: string }[]> {
    const url = `https://www.j-lis.go.jp/spd/code-address/${blockArea}/cms_1${regionId[0]}141${regionCode[0]}.html`;
    try {
      const textResponse = await this.fetchMunicipalityHtml(url);
  
      // 2. 都道府県のセクション（<h1>）を探す
      const prefecturePattern = new RegExp(`<h1>.*?${prefecture}.*?</h1>`, 'i');
      const prefectureMatch = textResponse.match(prefecturePattern);
  
      if (!prefectureMatch) {
        console.warn('Prefecture section not found.');
        return [];
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
  
      const uniqueMap = new Map();
      results.forEach(r => uniqueMap.set(r.name, r));
      return Array.from(uniqueMap.values());
  
    } catch (error) {
      console.error('Failed to fetch municipalities:', error);
      if (Platform.OS === 'web') {
        console.warn('Web fetch failed. If using local dev, run `npm run web:all` (or `npm run proxy` + `npm run web`).');
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
