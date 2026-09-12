import { app } from './serverless.js';
export default async function handler(req, res) {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined)
            headers.set(key, String(value));
    }
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
    }
    const request = new Request(url, {
        method: req.method,
        headers,
        body: body && body.length > 0 ? body : undefined,
    });
    const response = await app.fetch(request);
    res.statusCode = response.status;
    for (const [key, value] of response.headers.entries()) {
        res.setHeader(key, value);
    }
    const responseBody = await response.arrayBuffer();
    res.end(Buffer.from(responseBody));
}
