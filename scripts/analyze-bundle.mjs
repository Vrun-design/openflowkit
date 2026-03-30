import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const REPORT_PATH = path.join(DIST_DIR, 'bundle-report.html');

function toKb(bytes) {
  return Number((bytes / 1024).toFixed(1));
}

function readAssetEntries() {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error('Missing dist/assets. Run "npm run build" before "npm run build:analyze".');
  }

  return fs.readdirSync(ASSETS_DIR)
    .map((filename) => {
      const filePath = path.join(ASSETS_DIR, filename);
      const stats = fs.statSync(filePath);
      const extension = path.extname(filename).slice(1) || 'other';

      return {
        filename,
        extension,
        sizeBytes: stats.size,
        sizeKb: toKb(stats.size),
      };
    })
    .sort((left, right) => right.sizeBytes - left.sizeBytes);
}

function renderReport(entries) {
  const totalBytes = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
  const totalKb = toKb(totalBytes);
  const rows = entries.map((entry) => {
    const width = totalBytes === 0 ? 0 : Math.max((entry.sizeBytes / totalBytes) * 100, 1);
    return `
      <tr>
        <td><code>${entry.filename}</code></td>
        <td>${entry.extension.toUpperCase()}</td>
        <td>${entry.sizeKb} KB</td>
        <td>
          <div class="bar-track">
            <div class="bar-fill" style="width:${width}%"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>OpenFlowKit Bundle Report</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f4ef;
        --surface: #fffdf9;
        --text: #1d1d1b;
        --muted: #6f6a62;
        --border: #ddd4c7;
        --accent: #e95420;
        --accent-soft: rgba(233, 84, 32, 0.18);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px;
        background: linear-gradient(180deg, #faf6f0 0%, var(--bg) 100%);
        color: var(--text);
        font: 15px/1.5 "IBM Plex Sans", "Segoe UI", sans-serif;
      }
      main {
        max-width: 1040px;
        margin: 0 auto;
        padding: 28px;
        border: 1px solid var(--border);
        border-radius: 24px;
        background: color-mix(in srgb, var(--surface) 92%, white 8%);
        box-shadow: 0 22px 70px rgba(73, 51, 30, 0.08);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 30px;
        line-height: 1.1;
      }
      p {
        margin: 0 0 20px;
        color: var(--muted);
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin: 24px 0;
      }
      .card {
        padding: 16px;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: var(--surface);
      }
      .card-label {
        margin-bottom: 6px;
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .card-value {
        font-size: 24px;
        font-weight: 700;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        padding: 12px 10px;
        border-top: 1px solid var(--border);
        text-align: left;
        vertical-align: middle;
      }
      th {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      code {
        font-family: "SFMono-Regular", "Consolas", monospace;
        font-size: 13px;
      }
      .bar-track {
        width: 100%;
        height: 10px;
        border-radius: 999px;
        background: rgba(29, 29, 27, 0.08);
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--accent), #f28b4d);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Bundle Report</h1>
      <p>Generated from <code>dist/assets</code>. Use this after builds to spot chunk drift and oversized route payloads quickly.</p>
      <section class="summary">
        <div class="card">
          <div class="card-label">Total Assets</div>
          <div class="card-value">${entries.length}</div>
        </div>
        <div class="card">
          <div class="card-label">Total Size</div>
          <div class="card-value">${totalKb} KB</div>
        </div>
        <div class="card">
          <div class="card-label">Largest Asset</div>
          <div class="card-value">${entries[0]?.sizeKb ?? 0} KB</div>
        </div>
      </section>
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type</th>
            <th>Size</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </main>
  </body>
</html>`;
}

function main() {
  const entries = readAssetEntries();
  fs.writeFileSync(REPORT_PATH, renderReport(entries), 'utf8');
  console.log(`Bundle report written to ${REPORT_PATH}`);
}

main();
