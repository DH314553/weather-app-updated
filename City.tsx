import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export class City {
  prefecture: string;

  constructor(prefecture: string) {
    this.prefecture = prefecture;
  }

  async getMunicipalityDetails(blockArea: string, prefecture: string, regionId: number[], regionCode: number[]): Promise<{ name: string; kana: string }[]> {
    const url = `https://www.j-lis.go.jp/spd/code-address/${blockArea}/cms_1${regionId[0]}141${regionCode[0]}.html`;
    const finalUrl = Platform.OS === 'web' ? `https://api.allorigins.win/get?url=${url}` : url;
    try {
      const response = await fetch(finalUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
      }); 
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  
      let textResponse = "";
      if (Platform.OS === 'web') {
        // allorigins経由の場合、JSONの中にデータが入ってくる
        const jsonResponse = await response.json();
        textResponse = jsonResponse.contents || '';
      } else {
        textResponse = await response.text();
      }
  
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