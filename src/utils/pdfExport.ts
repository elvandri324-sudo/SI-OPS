import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFSummaryItem {
  label: string;
  value: string;
}

export interface PDFExtraTable {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  footRows?: (string | number)[][];
}

export interface ExportPDFOptions {
  filename: string;
  title: string;
  subtitle?: string;
  opsName?: string;
  orientation?: 'portrait' | 'landscape';
  summaryItems?: PDFSummaryItem[];
  headers: string[];
  rows: (string | number)[][];
  footRows?: (string | number)[][];
  extraTables?: PDFExtraTable[];
  ketuaName?: string;
  adminName?: string;
  kepalaNegeriName?: string;
}

export function downloadPDF(options: ExportPDFOptions): void {
  const {
    filename,
    title,
    subtitle,
    opsName = 'SISTEM INFORMASI - ORGANISASI PENGELOLA SAMPAH (OPS)',
    orientation = 'landscape',
    summaryItems = [],
    headers,
    rows,
    footRows = [],
    extraTables = [],
    ketuaName,
    adminName,
    kepalaNegeriName,
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;

  // Header Banner
  doc.setFillColor(15, 118, 110); // Teal-700
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Organization / System Name
  doc.setTextColor(204, 251, 241); // Teal-100
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(opsName.toUpperCase(), marginX, 7.5);

  // Main Report Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, marginX, 14.5);

  // Subtitle & Print Timestamp
  doc.setTextColor(204, 251, 241);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  if (subtitle) {
    doc.text(subtitle, marginX, 20.5);
  }

  const now = new Date();
  const dateOnlyStr = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const printDateStr = `Dicetak: ${dateOnlyStr} ${now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
  doc.text(printDateStr, pageWidth - marginX, 20.5, { align: 'right' });

  let currentY = 30;

  // Optional Summary KPI Strip
  if (summaryItems.length > 0) {
    const maxCols = Math.min(summaryItems.length, 4);
    const gap = 3;
    const boxWidth = (pageWidth - marginX * 2 - gap * (maxCols - 1)) / maxCols;
    const boxHeight = 14;

    summaryItems.forEach((item, index) => {
      const col = index % maxCols;
      const row = Math.floor(index / maxCols);
      const x = marginX + col * (boxWidth + gap);
      const y = currentY + row * (boxHeight + gap);

      doc.setFillColor(240, 253, 250); // Teal-50
      doc.setDrawColor(153, 246, 228); // Teal-200
      doc.roundedRect(x, y, boxWidth, boxHeight, 1.5, 1.5, 'FD');

      doc.setTextColor(71, 85, 105); // Slate-600
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(item.label.toUpperCase(), x + 3, y + 5);

      doc.setTextColor(15, 23, 42); // Slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(String(item.value), x + 3, y + 11);
    });

    const totalRows = Math.ceil(summaryItems.length / maxCols);
    currentY += totalRows * (boxHeight + gap) + 3;
  }

  // Determine font size dynamically based on column count so 12-month matrix fits cleanly
  const colCount = headers.length;
  const tableFontSize = colCount > 14 ? 6.2 : colCount > 10 ? 7.2 : 8.5;
  const cellPadding = colCount > 14 ? 1.4 : colCount > 10 ? 1.8 : 2.3;

  autoTable(doc, {
    startY: currentY,
    head: [headers.map(h => String(h ?? ''))],
    body: rows.map(r => r.map(c => String(c ?? ''))),
    foot: footRows.length > 0 ? footRows.map(r => r.map(c => String(c ?? ''))) : undefined,
    showFoot: 'lastPage',
    margin: { left: marginX, right: marginX, bottom: 14 },
    styles: {
      fontSize: tableFontSize,
      cellPadding,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 118, 110], // Teal-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    footStyles: {
      fillColor: [204, 251, 241], // Teal-100
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
  });

  // Extra tables if any
  for (const extra of extraTables) {
    const lastY = (doc as any).lastAutoTable?.finalY || currentY + 20;
    let nextY = lastY + 8;

    if (nextY + 25 > pageHeight) {
      doc.addPage();
      nextY = 16;
    }

    doc.setTextColor(15, 118, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(extra.title, marginX, nextY);

    autoTable(doc, {
      startY: nextY + 3,
      head: [extra.headers.map(h => String(h ?? ''))],
      body: extra.rows.map(r => r.map(c => String(c ?? ''))),
      foot:
        extra.footRows && extra.footRows.length > 0
          ? extra.footRows.map(r => r.map(c => String(c ?? '')))
          : undefined,
      showFoot: 'lastPage',
      margin: { left: marginX, right: marginX, bottom: 14 },
      styles: {
        fontSize: extra.headers.length > 10 ? 7.2 : 8.5,
        cellPadding: 2,
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
        textColor: [30, 41, 59],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      footStyles: {
        fillColor: [204, 251, 241],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
      },
    });
  }

  // Resolve Signatory Names from options or saved OPS profile in localStorage
  let resolvedKetua = ketuaName?.trim();
  let resolvedAdmin = adminName?.trim();
  let resolvedKepalaNegeri = kepalaNegeriName?.trim();

  if (!resolvedKetua || !resolvedAdmin || !resolvedKepalaNegeri) {
    try {
      const savedOpsRaw = localStorage.getItem('siops_ops_v1');
      if (savedOpsRaw) {
        const parsedOps = JSON.parse(savedOpsRaw);
        if (Array.isArray(parsedOps)) {
          const matchedOps = parsedOps.find(
            (o: any) =>
              o &&
              typeof o.nama === 'string' &&
              o.nama.trim().toLowerCase() === opsName.trim().toLowerCase()
          );
          if (matchedOps) {
            if (!resolvedKetua && matchedOps.ketua && matchedOps.ketua !== '-') {
              resolvedKetua = matchedOps.ketua;
            }
            if (!resolvedAdmin && matchedOps.adminOps && matchedOps.adminOps !== '-') {
              resolvedAdmin = matchedOps.adminOps;
            }
            if (
              !resolvedKepalaNegeri &&
              matchedOps.kepalaPemerintahNegeri &&
              matchedOps.kepalaPemerintahNegeri !== '-'
            ) {
              resolvedKepalaNegeri = matchedOps.kepalaPemerintahNegeri;
            }
          }
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }

  const formatSignName = (name?: string) =>
    name && name !== '-' ? `( ${name} )` : '( ........................................ )';

  // Signature Block: Ketua OPS, Admin OPS, & Mengetahui Kepala Pemerintah Negeri
  const lastTableY = (doc as any).lastAutoTable?.finalY || currentY + 20;
  const sigBlockHeight = 36;
  let sigY = lastTableY + 10;

  if (sigY + sigBlockHeight > pageHeight - 12) {
    doc.addPage();
    sigY = 20;
  }

  const usableWidth = pageWidth - marginX * 2;
  const colW = usableWidth / 3;
  const col1X = marginX + colW * 0.5;
  const col2X = marginX + colW * 1.5;
  const col3X = marginX + colW * 2.5;

  // Date line on the right above signature columns
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tanggal: ${dateOnlyStr}`, pageWidth - marginX, sigY, { align: 'right' });

  const rowTopLabelY = sigY + 6;
  const rowRoleTitleY = sigY + 10.5;
  const rowNameY = sigY + 29;

  // Top labels
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Disetujui Oleh,', col1X, rowTopLabelY, { align: 'center' });
  doc.text('Disiapkan Oleh,', col2X, rowTopLabelY, { align: 'center' });
  doc.text('Mengetahui,', col3X, rowTopLabelY, { align: 'center' });

  // Role titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Ketua OPS', col1X, rowRoleTitleY, { align: 'center' });
  doc.text('Admin OPS', col2X, rowRoleTitleY, { align: 'center' });
  doc.text('Kepala Pemerintah Negeri', col3X, rowRoleTitleY, { align: 'center' });

  // Signatory names / dotted brackets
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatSignName(resolvedKetua), col1X, rowNameY, { align: 'center' });
  doc.text(formatSignName(resolvedAdmin), col2X, rowNameY, { align: 'center' });
  doc.text(formatSignName(resolvedKepalaNegeri), col3X, rowNameY, { align: 'center' });

  // Page numbering footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${opsName} — ${title}`, marginX, pageHeight - 6);
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - marginX, pageHeight - 6, {
      align: 'right',
    });
  }

  const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(finalFilename);
}
