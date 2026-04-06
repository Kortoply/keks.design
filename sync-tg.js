const fs = require('fs');
const https = require('https');

const CHANNEL_NAME = 'casebykeks';

async function fetchTelegram() {
    const url = `https://t.me/s/${CHANNEL_NAME}`;
    console.log(`Запрашиваю данные с: ${url}`);

    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parsePosts(html) {
    const posts = [];
    const items = html.split('js-widget_message_wrap');

    for (let i = 1; i < items.length; i++) {
        const item = items[i];

        const textMatch = item.match(/js-message_text[^>]*>([\s\S]*?)<\/div>/);
        let text = textMatch ? textMatch[1].replace(/<[^>]*>/g, '').trim() : "";

        const linkMatch = item.match(/href="([^"]*?t\.me\/[^"]*?\/\d+)"/);
        const link = linkMatch ? linkMatch[1] : `https://t.me/${CHANNEL_NAME}`;

        let img = null;
        const imgMatch = item.match(/background-image:url\(['"]?([^'"]*?)['"]?\)/);

        if (imgMatch && imgMatch[1]) {
            // Заменили wsrv.nl на более надежный corsproxy, который решает проблему с РФ
            const rawUrl = imgMatch[1];
            img = `https://corsproxy.io/?url=${encodeURIComponent(rawUrl)}`;
        }

        const dateMatch = item.match(/datetime="([^"]*?)"/);
        const date = dateMatch ? dateMatch[1] : new Date().toISOString();

        if (text || img) {
            posts.push({ text, link, img, date });
        }
    }

    return posts.reverse().slice(0, 30);
}

async function run() {
    try {
        const html = await fetchTelegram();
        const posts = parsePosts(html);
        console.log(`Успешно спарсено постов: ${posts.length}`);

        fs.writeFileSync('posts.json', JSON.stringify(posts, null, 2));
        console.log("Результат записан в posts.json");
    } catch (err) {
        console.error("Ошибка выполнения:", err);
        process.exit(1);
    }
}

run();