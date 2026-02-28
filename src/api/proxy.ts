type QueryParam = string | string[] | undefined;
type ProxyRequest = {
  method?: string;
  query: Record<string, QueryParam>;
};

type ProxyResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    end: () => any;
    json: (body: any) => any;
    send: (body: any) => any;
  };
};

export default async function handler(req: ProxyRequest, res: ProxyResponse) {
  // 1. CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. クエリパラメータの抽出（配列対策）
  const getQueryParam = (param: string | string[] | undefined): string => {
    return Array.isArray(param) ? param[0] : param || '';
  };

  const urlParam = getQueryParam(req.query.url);
  const blockArea = getQueryParam(req.query.blockArea);
  const regionId = getQueryParam(req.query.regionId);
  const regionCode = getQueryParam(req.query.regionCode);

  let targetUrl = '';

  // 3. ターゲットURLの組み立て
  if (blockArea && regionId && regionCode) {
    // J-LISの仕様に合わせ、必要に応じて数値を文字列として扱う
    targetUrl = `https://www.j-lis.go.jp/spd/code-address/${blockArea}/cms_1${regionId}141${regionCode}.html`;
  } else if (urlParam) {
    // Nominatimなどの汎用URL
    targetUrl = decodeURIComponent(urlParam);
  }

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing parameters (url or blockArea/regionId/regionCode)' });
  }

  // 4. セキュリティ・バリデーション
  const allowedDomains = ['www.j-lis.go.jp', 'nominatim.openstreetmap.org'];
  try {
    const parsedUrl = new URL(targetUrl);
    if (!allowedDomains.includes(parsedUrl.hostname)) {
      return res.status(403).json({ error: `Domain ${parsedUrl.hostname} is not allowed` });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    // 5. ターゲットへリクエスト
    const response = await fetch(targetUrl, {
      headers: {
        // 相手サーバーに拒絶されないためのブラウザ偽装
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Target responded with status: ${response.status}`);
    }

    // 6. レスポンスの処理
    // Shift-JISを壊さないよう、一度バイナリとして受け取る
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 相手のContent-Type（charset含む）をそのまま引き継ぐ
    const contentType = response.headers.get('content-type') || 'text/html; charset=Shift_JIS';
    res.setHeader('Content-Type', contentType);
    
    // キャッシュを有効化（1時間）して高速化
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    return res.status(200).send(buffer);

  } catch (error: any) {
    console.error('Proxy Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
