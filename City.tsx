import * as FileSystem from 'expo-file-system';

export class City {
  prefecture: string;

  constructor(prefecture: string) {
    this.prefecture = prefecture;
  }

  async getMunicipalityDetails(blockArea: string, prefecture: string, regionId: number[], regionCode: number[]): Promise<{ name: string; kana: string }[]> {
    const url = `https://www.j-lis.go.jp/spd/code-address/${blockArea}/cms_1${regionId[0]}141${regionCode[0]}.html`;
    
    try {
      // 1. Fetch (文字化け対策が必要な場合は前述の blob/FileReader 方式を推奨)
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const textResponse = await response.text();

      // 2. 都道府県のセクション（<h1>）を探す
      const prefecturePattern = new RegExp(`<h1>.*?${prefecture}.*?</h1>`, 'i');
      const prefectureMatch = textResponse.match(prefecturePattern);

      if (!prefectureMatch) {
        console.warn('Prefecture section not found.');
        return [];
      }

      // 見出し以降のHTMLを抽出
      const prefectureSection = textResponse.substring(prefectureMatch.index! + prefectureMatch[0].length);

      // 3. <td> タグの中身をすべて抽出
      // J-LISの表は [市区町村名] [読みがな] [所在地] の順で <td> が並んでいます
      const tdPattern = /<td>([\s\S]*?)<\/td>/gi;
      let cells: string[] = [];
      let match;
      while ((match = tdPattern.exec(prefectureSection)) !== null) {
        const content = match[1].replace(/<[^>]*>?/gm, '').trim(); // タグ除去
        if (content) cells.push(content);
      }

      const results: { name: string; kana: string }[] = [];
      const excludeList = ["都道府県", "市区町村", "所在地", "読みがな", "一番町"];

      // 4. セルをループして「漢字名」とその直後の「ひらがな」のペアを探す
      for (let i = 0; i < cells.length - 1; i++) {
        const nameCandidate = cells[i];
        const kanaCandidate = cells[i + 1];

        // 漢字名の判定 (市町村区島で終わる)
        const isName = /[一-龯ヶ]+(?:市|町|村|区|島)$/.test(nameCandidate);
        // 読みがなの判定 (ひらがなである)
        const isKana = /^[ぁ-んー]+$/.test(kanaCandidate);

        if (isName && isKana && !excludeList.some(ex => nameCandidate.includes(ex))) {
          results.push({ name: nameCandidate, kana: kanaCandidate });
          i++; // ペアを見つけたので読みがなのセルをスキップ
        }
      }

      // 重複削除
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