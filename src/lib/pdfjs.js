import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker URL — more reliable than Vite file-based resolution
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

export { pdfjsLib };