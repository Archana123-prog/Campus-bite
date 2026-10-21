import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Info } from 'lucide-react';
import { useConfigStore } from '../../store/useConfigStore';

const makeUrl = (base, table) => `${base.replace(/\/$/, '')}/menu?orderType=DINE_IN&table=${encodeURIComponent(table)}`;

function Sticker({ table, base, size = 180 }) {
  return (
    <div className="print-sticker flex w-64 flex-col items-center rounded-3xl bg-ink-900 p-5 text-center text-white">
      <p className="text-xs font-semibold text-brand-300">CampusBite canteen</p>
      <p className="font-display text-4xl font-extrabold">Table {table}</p>
      <div className="my-3 rounded-2xl bg-white p-3">
        <QRCodeSVG value={makeUrl(base, table)} size={size} level="H" />
      </div>
      <p className="text-xs text-ink-200">Scan to order. Food comes to your seat.</p>
    </div>
  );
}

export default function TableQRGenerator() {
  const tableCount = useConfigStore((s) => s.tableCount);
  const [table, setTable] = useState('1');
  const [base, setBase] = useState(window.location.origin);
  const previewRef = useRef(null);

  const isLocal = /localhost|127\.0\.0\.1/.test(base);

  const downloadPng = () => {
    const svg = previewRef.current?.querySelector('svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#11141F';
      ctx.fillRect(0, 0, 1000, 1200);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FDC456';
      ctx.font = '600 44px sans-serif';
      ctx.fillText('CampusBite canteen', 500, 110);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 110px sans-serif';
      ctx.fillText(`Table ${table}`, 500, 240);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(150, 300, 700, 700);
      ctx.drawImage(img, 180, 330, 640, 640);
      ctx.fillStyle = '#CDD1DE';
      ctx.font = '500 38px sans-serif';
      ctx.fillText('Scan to order. Food comes to your seat.', 500, 1100);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `table-${table}-qr.png`;
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">Table QR stickers</h2>
      <p className="text-sm text-ink-500 dark:text-ink-300">Stick one on every canteen table. Scanning opens the menu already set to that table.</p>

      {isLocal && (
        <div className="mt-4 flex gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-900 dark:bg-brand-500/10 dark:text-brand-200">
          <Info size={18} className="shrink-0" />
          <p>The address below is <b>localhost</b>, which phones cannot open. Replace it with your deployed website URL before printing.</p>
        </div>
      )}

      <div className="mt-5 grid items-start gap-6 md:grid-cols-[1fr_auto]">
        <div className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="qr-table">Table number</label>
            <input id="qr-table" className="input" value={table} maxLength={10} onChange={(e) => setTable(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="qr-base">Website address</label>
            <input id="qr-base" className="input font-mono text-xs" value={base} onChange={(e) => setBase(e.target.value)} />
          </div>
          <p className="break-all rounded-lg bg-ink-50 p-2 font-mono text-[11px] text-ink-500 dark:bg-ink-800">{makeUrl(base, table || '1')}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadPng} className="btn-primary"><Download size={16} /> Download PNG</button>
            <button onClick={() => window.print()} className="btn-ghost"><Printer size={16} /> Print all {tableCount} tables</button>
          </div>
        </div>

        <div ref={previewRef} className="mx-auto"><Sticker table={table || '1'} base={base} /></div>
      </div>

      {/* Only visible when printing */}
      <div className="print-area hidden grid-cols-2 gap-6 p-6 print:grid">
        {Array.from({ length: tableCount }, (_, i) => String(i + 1)).map((t) => (
          <Sticker key={t} table={t} base={base} size={170} />
        ))}
      </div>
    </div>
  );
}
