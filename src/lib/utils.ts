export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function triggerDownloadOverlay(title: string, onDownload: () => void, summary?: string[]) {
  window.dispatchEvent(new CustomEvent('show-download-overlay', { detail: { title, onDownload, summary } }))
}

export function downloadZip(
  blobs: { blob: Blob; name: string }[],
  zipName: string
) {
  import('jszip').then(({ default: JSZip }) => {
    const zip = new JSZip();
    blobs.forEach(({ blob, name }) => zip.file(name, blob));
    zip.generateAsync({ type: 'blob' }).then((zipBlob) => {
      downloadBlob(zipBlob, zipName);
    });
  });
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
