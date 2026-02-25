const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// すべてのリクエストに対してCORSを許可
app.use(cors());

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('No URL provided');
    }

    try {
        // ターゲットURLへリクエストを転送
        const response = await axios.get(targetUrl, {
            // ブラウザからのリクエストに見せかける
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            // バイナリで受け取る（Shift-JISなどの文字化け対策を後でする場合のため）
            responseType: 'arraybuffer' 
        });

        // ターゲットのContent-Typeをそのまま引き継ぐ
        const contentType = response.headers['content-type'];
        res.set('Content-Type', contentType);
        
        // 取得したデータをそのままクライアントに返す
        res.send(response.data);

    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).send('Error fetching the target URL');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));