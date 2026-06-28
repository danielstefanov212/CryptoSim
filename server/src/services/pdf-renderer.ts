import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import PDFDocument from 'pdfkit';

import type { ReportRunResponse } from './report-runner.js';

const CHART_W = 1200;
const CHART_H = 600;

const chartCanvas = new ChartJSNodeCanvas({
  width: CHART_W,
  height: CHART_H,
  backgroundColour: 'white',
});

async function renderChartPng(run: ReportRunResponse): Promise<Buffer> {
  const series = run.points.map((p) => (p.value === null ? null : Number(p.value)));
  return chartCanvas.renderToBuffer({
    type: 'line',
    data: {
      labels: run.points.map((p) => new Date(p.t).toLocaleString()),
      datasets: [
        {
          label: 'Portfolio value (USD)',
          data: series,
          borderColor: 'rgb(34, 130, 240)',
          backgroundColor: 'rgba(34, 130, 240, 0.15)',
          fill: true,
          tension: 0.2,
          pointRadius: 0,
          spanGaps: false,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: true },
        title: { display: true, text: run.template.name, font: { size: 20 } },
      },
      scales: {
        y: { beginAtZero: false, title: { display: true, text: 'USD' } },
        x: { ticks: { maxTicksLimit: 12 } },
      },
    },
  });
}

export async function renderReportPdf(run: ReportRunResponse): Promise<Buffer> {
  const chartPng = await renderChartPng(run);
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(20).text(run.template.name, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555');
    doc.text(`Window: ${run.window.start} → ${run.window.end}`);
    doc.text(
      `Granularity: ${run.window.granularity}${
        run.window.effectiveGranularity
          ? ` (clamped to ${run.window.effectiveGranularity})`
          : ''
      }`,
    );
    doc.text(
      `Symbols: ${run.template.symbols.length > 0 ? run.template.symbols.join(', ') : 'All your holdings'}`,
    );
    if (run.inactiveSymbols.length > 0) {
      doc.text(
        `Inactive symbols (excluded from chart): ${run.inactiveSymbols.join(', ')}`,
      );
    }
    if (run.dataGaps.length > 0) {
      doc.text(
        `Data gaps: ${run.dataGaps
          .map(
            (g) =>
              `${g.symbol} (${g.reason === 'fetch_failed' ? 'fetch failed' : `before ${g.gapBefore}`})`,
          )
          .join('; ')}`,
      );
    }
    doc.moveDown(1);
    doc.fillColor('#000');
    doc.image(chartPng, {
      fit: [doc.page.width - 100, 360],
      align: 'center',
    });
    doc.end();
  });
}
