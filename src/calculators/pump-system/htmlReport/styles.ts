// HTML 산출서 — CSS 스타일 블록 (레퍼런스 파일 그대로)
// reference/handoff_html_export/HVAC 펌프 산출서.html <style> 내용

export const REPORT_CSS = `
  :root{
    --ink:#0B1120; --ink-2:#1F2937; --mute:#475569; --line:#94A3B8; --line-soft:#CBD5E1;
    --paper:#FFFFFF; --paper-2:#F8FAFC; --paper-3:#F1F5F9;
    --accent:#1F3A6E; --accent-2:#A4133C;
    --hi:#FEF9C3;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#E5E7EB;color:var(--ink);font-family:'Pretendard',-apple-system,system-ui,sans-serif;}

  .toolbar{
    position:sticky;top:0;z-index:10;
    background:rgba(15,23,42,0.92);backdrop-filter:blur(8px);
    color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;
    font-size:12px;
  }
  .toolbar .name{font-weight:600;letter-spacing:.3px}
  .toolbar .actions{display:flex;gap:8px}
  .toolbar button{
    padding:6px 12px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);
    color:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;
  }
  .toolbar button.primary{background:#fff;color:#0B1120;border-color:#fff}

  .sheet{
    width:210mm; min-height:297mm;
    margin:18px auto; background:var(--paper);
    box-shadow:0 6px 30px rgba(0,0,0,0.18);
    padding:18mm 16mm 16mm; font-size:10.5pt; line-height:1.5; color:var(--ink);
    page-break-after:always;
  }
  .sheet:last-child{page-break-after:auto}

  .doc-head{
    display:flex;justify-content:space-between;align-items:flex-end;
    border-bottom:2.5px solid var(--accent); padding-bottom:8px; margin-bottom:14px;
  }
  .doc-head .brand{display:flex;align-items:center;gap:10px}
  .doc-head .brand img{height:28px;width:auto;display:block}
  .doc-head .brand .label{font-size:9pt;color:var(--mute);letter-spacing:1.5px}
  .doc-head .meta{text-align:right;font-size:9pt;color:var(--mute);line-height:1.45}
  .doc-head .meta .doc-no{color:var(--ink);font-weight:600;letter-spacing:.5px}

  .sheet.cover{padding:0;}
  .cover-band{
    height:14mm;background:#EEF2F7;
    display:flex;align-items:center;justify-content:space-between;
    padding:0 14mm;color:var(--ink-2);
    border-bottom:1px solid var(--line);
  }
  .cover-band .tag{font-size:9.5pt;letter-spacing:6px;font-weight:700;color:var(--accent)}
  .cover-band .docno{font-size:9.5pt;letter-spacing:.5px;font-weight:500;color:var(--mute)}
  .cover-band-thin{height:2mm;background:var(--accent);opacity:.55;}
  .cover-body{flex:1;display:flex;flex-direction:column;padding:18mm 18mm 0;}
  .cover-kicker{
    font-size:10pt;color:var(--mute);letter-spacing:5px;
    border-bottom:1px solid var(--line);padding-bottom:6px;margin-bottom:18mm;
  }
  .cover-titleblock{margin-bottom:14mm}
  .cover-titleblock .system{
    font-size:11pt;color:var(--accent);font-weight:700;letter-spacing:1px;margin-bottom:10px;
  }
  .cover-titleblock h1{
    font-size:30pt;font-weight:700;margin:0 0 8px;letter-spacing:-.8px;color:var(--ink);line-height:1.15;
  }
  .cover-titleblock .en{font-size:10.5pt;color:var(--mute);letter-spacing:.3px;font-weight:400;}
  .cover-info{width:100%;}
  .cover-info table{width:100%;border-collapse:collapse;font-size:10pt}
  .cover-info td{
    padding:9px 14px;border-bottom:1px solid var(--line-soft);
    white-space:nowrap;vertical-align:middle;
  }
  .cover-info tr:first-child td{border-top:2px solid var(--ink)}
  .cover-info tr:last-child td{border-bottom:2px solid var(--ink)}
  .cover-info td.lbl{
    width:22%;background:var(--paper-3);color:var(--mute);
    font-weight:600;letter-spacing:1px;font-size:9pt;
  }
  .cover-info td.val{color:var(--ink);font-weight:500}
  .cover-info td.val.strong{font-weight:700;color:var(--accent)}
  .cover-info td.val[contenteditable="true"]{cursor:text;}
  .cover-info td.val[contenteditable="true"]:hover{background:#FEF9C3;}
  .cover-info td.val[contenteditable="true"]:focus{outline:2px solid var(--accent);outline-offset:-2px;background:#fff;}
  .cover-info td.val[contenteditable="true"]:empty::before{content:attr(data-ph);color:#CBD5E1;font-weight:400;}
  @media print{
    .cover-info td.val[contenteditable="true"]:hover,
    .cover-info td.val[contenteditable="true"]:focus{
      background:transparent !important;outline:none !important;
    }
  }
  .cover-foot{
    margin-top:auto;padding:14mm 18mm 16mm;
    display:flex;justify-content:space-between;align-items:flex-end;
    border-top:1px solid var(--line-soft);
  }
  .cover-foot .signoff{font-size:9.5pt;color:var(--mute);line-height:1.6}
  .cover-foot .signoff .company{font-size:13pt;color:var(--ink);font-weight:700;letter-spacing:1.5px;margin-bottom:4px;}
  .cover-foot .biglogo img{height:60px;width:auto;display:block}

  h2.sec{
    font-size:11.5pt;margin:18px 0 8px;
    color:var(--ink);font-weight:700;
    border-left:4px solid var(--accent); padding:2px 10px;
    background:var(--paper-3);
  }
  h2.sec .num{color:var(--accent);margin-right:8px;font-weight:700}

  table.k{width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:9.5pt;}
  table.k th, table.k td{
    border:1px solid var(--line); padding:5px 8px; text-align:left; vertical-align:middle;
    white-space:nowrap;
  }
  table.k td.wrap, table.k th.wrap{white-space:normal;}
  table.k th{background:#E2E8F0;font-weight:600;color:var(--ink);text-align:center;font-size:9pt;letter-spacing:.3px}
  table.k td.num{text-align:right;font-variant-numeric:tabular-nums;font-feature-settings:'tnum'}
  table.k td.c{text-align:center}
  table.k tr.total td{background:var(--paper-3);font-weight:700}
  table.k tr.hl td{background:var(--hi)}
  table.k tr.hl td:first-child{font-weight:700}
  .badge-ok{display:inline-block;padding:1px 8px;border-radius:3px;background:#DCFCE7;color:#15803D;font-size:8.5pt;font-weight:600}
  .badge-warn{display:inline-block;padding:1px 8px;border-radius:3px;background:#FEE2E2;color:#B91C1C;font-size:8.5pt;font-weight:600}

  .note{font-size:8.5pt;color:var(--mute);margin:-6px 0 12px;padding-left:4px}
  .note code{background:var(--paper-3);padding:1px 4px;border-radius:3px;font-size:8pt}

  ul.refs{list-style:none;padding:0;margin:0;column-count:2;column-gap:14px;font-size:9pt;color:var(--ink-2)}
  ul.refs li{padding:3px 0;break-inside:avoid;border-bottom:1px dotted var(--line-soft)}
  ul.refs li b{color:var(--accent);font-weight:600}

  .doc-foot{
    margin-top:18px;padding-top:8px;border-top:1px solid var(--line-soft);
    display:flex;justify-content:space-between;font-size:8.5pt;color:var(--mute);
  }

  *{
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  @page { size: A4; margin: 0; }
  @media print {
    html, body{background:#fff !important}
    .toolbar{display:none}
    .sheet{margin:0;box-shadow:none;width:auto;min-height:auto;padding:14mm 12mm 12mm}
    .sheet{page-break-after:always}
    .sheet:last-child{page-break-after:auto}
  }
`;
