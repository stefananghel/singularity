import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { user_login, user_password, remember } = req.body;

    if (!user_login || !user_password) {
        res.status(400).json({ error: 'Missing required fields: user_login or user_password' });
        return;
    }

    try {
        const response = await fetch('https://colegiulfizioterapeutilor.ro/wp-admin/admin-ajax.php?action=stm_lms_login&nonce=c33101ba34', {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'accept-language': 'en-US,en;q=0.9,ro;q=0.8',
                'cache-control': 'no-cache',
                'content-type': 'application/json',
                'origin': 'https://colegiulfizioterapeutilor.ro',
                'pragma': 'no-cache',
                'priority': 'u=1, i',
                'referer': 'https://colegiulfizioterapeutilor.ro/user-account/',
                'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({
                user_login,
                user_password,
                remember
            })
        });

        const data = await response.json();

        res.status(response.status).json(data);
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}