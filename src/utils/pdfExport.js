function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPdfHtml({ title, subtitle, columns, renderedRows, fileName }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(fileName)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
        margin: 28px;
      }
      .header {
        margin-bottom: 18px;
      }
      h1 {
        font-size: 24px;
        margin: 0 0 6px;
      }
      p {
        margin: 0;
        color: #475569;
        font-size: 13px;
        line-height: 1.5;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      th, td {
        border: 1px solid #dbe2ea;
        padding: 10px 12px;
        text-align: left;
        vertical-align: top;
        font-size: 12px;
        word-break: break-word;
      }
      th {
        background: #f8fafc;
        font-size: 11px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #475569;
      }
      @media print {
        body {
          margin: 16px;
        }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(subtitle)}</p>
    </div>
    <table>
      <thead>
        <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr>
      </thead>
      <tbody>${renderedRows}</tbody>
    </table>
  </body>
</html>`;
}

export function openPdfExport({ title, subtitle = '', columns = [], rows = [], fileName = 'export' }) {
  if (typeof window === 'undefined') {
    return false;
  }

  const renderedRows = rows.length
    ? rows.map((row) => `
        <tr>
          ${columns.map((column) => `<td>${escapeHtml(column.render ? column.render(row) : row[column.key] ?? '—')}</td>`).join('')}
        </tr>
      `).join('')
    : `<tr><td colspan="${Math.max(columns.length, 1)}">No data available for this view.</td></tr>`;

  const html = buildPdfHtml({ title, subtitle, columns, renderedRows, fileName });
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument || frameWindow?.document;

  if (!frameWindow || !frameDocument) {
    iframe.remove();
    throw new Error('Unable to prepare the PDF export right now. Please try again.');
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 300);
  };

  frameWindow.addEventListener('afterprint', cleanup, { once: true });

  window.setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
  }, 200);

  return true;
}
