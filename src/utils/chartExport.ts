import { toBlob, toPng } from 'html-to-image';
import html2canvas from 'html2canvas-pro';

export interface CopyChartResult {
  success: boolean;
  action: 'copied' | 'downloaded' | 'failed';
  message: string;
}

/**
 * Salin elemen visual grafik ke clipboard sebagai gambar PNG tajam (High DPI).
 * Mendukung warna Tailwind CSS modern (oklab/oklch) melalui html-to-image.
 */
export async function copyChartToClipboard(
  element: HTMLElement | null,
  fileNamePrefix: string = 'grafik'
): Promise<CopyChartResult> {
  if (!element) {
    return {
      success: false,
      action: 'failed',
      message: 'Elemen grafik tidak ditemukan.',
    };
  }

  try {
    let blob: Blob | null = null;

    // 1. Coba dengan html-to-image terlebih dahulu (mendukung oklab & CSS modern)
    try {
      blob = await toBlob(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: true,
      });
    } catch (h2iErr) {
      console.warn('html-to-image gagal, mencoba html2canvas:', h2iErr);
    }

    // 2. Fallback html2canvas bila html-to-image gagal
    if (!blob) {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(b => resolve(b), 'image/png');
      });
    }

    if (!blob) {
      throw new Error('Gagal mengonversi grafik menjadi format gambar PNG.');
    }

    let copiedToClipboard = false;

    // Coba simpan langsung ke clipboard sistem (Async Clipboard API)
    if (navigator?.clipboard?.write && window.isSecureContext) {
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        copiedToClipboard = true;
      } catch (clipErr) {
        console.warn('Clipboard write dibatasi oleh browser/iframe, beralih ke download langsung:', clipErr);
      }
    }

    if (copiedToClipboard) {
      return {
        success: true,
        action: 'copied',
        message: 'Gambar grafik berhasil disalin ke clipboard! Siap di-paste (Ctrl+V) ke WhatsApp, Word, Excel, dll.',
      };
    }

    // Fallback bila clipboard diblokir lingkungan browser: unduh file PNG secara otomatis
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return {
      success: true,
      action: 'downloaded',
      message: 'Gambar grafik berhasil diunduh ke folder unduhan (karena akses clipboard dibatasi oleh sandbox browser).',
    };
  } catch (err: any) {
    console.error('Error saat menyalin grafik:', err);
    return {
      success: false,
      action: 'failed',
      message: `Gagal menyalin grafik: ${err?.message || 'Terjadi kesalahan sistem'}`,
    };
  }
}

/**
 * Unduh elemen grafik langsung sebagai file gambar PNG
 */
export async function downloadChartAsPNG(
  element: HTMLElement | null,
  fileNamePrefix: string = 'grafik'
): Promise<boolean> {
  if (!element) return false;
  try {
    let dataUrl: string | null = null;
    try {
      dataUrl = await toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: true,
      });
    } catch {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      dataUrl = canvas.toDataURL('image/png');
    }

    if (!dataUrl) return false;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Error saat download grafik PNG:', err);
    return false;
  }
}
