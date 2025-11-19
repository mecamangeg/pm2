// Mock Next.js 15.5.6 (Turbopack) process for PM2 monitoring demo
const http = require('http');

const PORT = 3012;

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Next.js App</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 40px; }
          h1 { color: #0070f3; }
        </style>
      </head>
      <body>
        <h1>Next.js 15.5.6 (Turbopack)</h1>
        <p>Running on http://localhost:${PORT}</p>
        <p>This is a mock Next.js process monitored by PM2</p>
        <p>Time: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`✓ Ready in 1.2s`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Network: http://0.0.0.0:${PORT}`);
});

// Simulate periodic activity
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Compiled successfully`);
}, 30000);
