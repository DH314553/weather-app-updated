export class City {
  prefecture: string;

  constructor(prefecture: string) {
    this.prefecture = prefecture;
  }

  async getMunicipalities(blockArea: string, prefecture: string, regionId: number[], regionCode: number[]): Promise<string[]> {
    const regionIdNumber = regionId[0];
    const regionCodeNumber = regionCode[0];
    const regionNameChar = blockArea;
    const url = `https://www.j-lis.go.jp/spd/code-address/${regionNameChar}/cms_1${regionIdNumber}141${regionCodeNumber}.html`;
    console.log('Fetching municipalities:', url);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch municipalities: ${response.statusText}`);
      }

      const textResponse = await response.text();
      console.log('Fetched municipalities:', textResponse);

      // 都道府県名を含む <h1> タグを検索const prefecturePattern = new RegExp(`<h1>.*?${prefecture}.*?</h1>`, 'i');
      const prefecturePattern = new RegExp(`<h1>.*?${prefecture}.*?</h1>`, 'i');
      const prefectureMatch = textResponse.match(prefecturePattern);

      if (prefectureMatch) {
        // 都道府県名を含む部分を無視して、その後の市町村区を抽出
        const prefectureSection = prefectureMatch && prefectureMatch.index !== undefined ? textResponse.substring(prefectureMatch.index + prefectureMatch[0].length) : '';
    
        // 市町村区（市・町・村・区・島）を含む文字列を抽出
        const municipalitiesPattern = /[一-龯ヶ]+(?:市|町|村|区|島)/g;
        let municipalities = prefectureSection.match(municipalitiesPattern) || [];
    
        // 除外リスト
        const excludeList = ["都道府県別市区町村", "全国町村", "東京都千代田区一番町"];
        
        // 除外リストを適用
        const filteredMunicipalities = municipalities.filter(m => !excludeList.includes(m));
    
        // 重複を排除して返す
        return Array.from(new Set(filteredMunicipalities));
      } else {
        console.warn('Prefecture section not found in the fetched data.');
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch municipalities:', error);
      return [];
    }
  }
}