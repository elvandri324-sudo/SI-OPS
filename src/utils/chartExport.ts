import html2canvas from 'html2canvas-pro';

export interface CopyChartResult {
  success: boolean;
  action: 'copied' | 'downloaded' | 'failed';
  message: string;
}

/**
 * Salin elemen visual grafik ke clipboard sebagai gambar PNG tajam (High DPI).
 * Bila perizinan clipboard dibatasi (misal dalam lingkungan iframe/sandbox),
 * fungsi ini otomatis mengunduh file PNG secara anggun agar pengguna tetap mendapatkan gambar.
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
    // Generate high-resolution canvas dari elemen DOM / SVG Recharts
    const canvas = await html2canvas(element, {
      scale: 2, // Resolusi 2x tajam retina
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(b => resolve(b), 'image/png');
    });

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
        console.warn('Clipboard write dibatasi oleh izin browser/iframe, beralih ke download langsung:', clipErr);
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
      message: 'Gambar grafik berhasil diunduh ke folder unduhan perangkat (karena clipboard dibatasi izin iframe).',
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
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
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
