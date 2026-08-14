import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, AlertTriangle, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { pdfjsLib } from '@/lib/pdfjs';

const LOAD_TIMEOUT_MS = 45000;
const PLACEHOLDER_HOSTS = new Set(['example.com', 'www.example.com']);
const ZOOM_MIN = 0.75;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const ZOOM_DEFAULT = 1;

const READ_ONLY_STYLE = {
  WebkitUserSelect: 'none',
  userSelect: 'none',
  WebkitTouchCallout: 'none',
};

function isPlaceholderUrl(url) {
  try {
    return PLACEHOLDER_HOSTS.has(new URL(url).hostname);
  } catch {
    return !url?.startsWith('http');
  }
}

function clampZoom(value) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}

function getTouchDistance(touches) {
  const [a, b] = touches;
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

/** Load PDF bytes into memory for rendering only — never saved to device storage. */
async function loadPdfForViewing(url) {
  const tryFetch = async (init) => {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('URL did not return a PDF document');
    }
    return response.arrayBuffer();
  };

  try {
    return await tryFetch({ mode: 'cors', credentials: 'omit' });
  } catch {
    return await tryFetch({ credentials: 'include' });
  }
}

function protectCanvas(canvas) {
  canvas.className = 'block max-w-none h-auto mb-3 rounded shadow-sm bg-white pointer-events-none select-none mx-auto';
  canvas.setAttribute('draggable', 'false');
  canvas.oncontextmenu = (e) => e.preventDefault();
}

async function renderPageToCanvas(page, containerWidth, zoom) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
  const baseViewport = page.getViewport({ scale: 1 });
  const fitScale = containerWidth / baseViewport.width;
  const renderScale = fitScale * zoom * pixelRatio;
  const viewport = page.getViewport({ scale: renderScale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
  canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;

  protectCanvas(canvas);

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

export default function PdfViewer({ url, title, onClose, allowDownload = false }) {
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [renderedPages, setRenderedPages] = useState(0);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [isRerendering, setIsRerendering] = useState(false);

  const pagesContainerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const readyRef = useRef(false);
  const pdfDocRef = useRef(null);
  const pinchRef = useRef({ active: false, startDistance: 0, startZoom: ZOOM_DEFAULT });
  const zoomRef = useRef(ZOOM_DEFAULT);
  const prevZoomRef = useRef(null);

  const getContainerWidth = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el?.clientWidth) {
      return Math.max(el.clientWidth - 32, 280);
    }
    return Math.max(window.innerWidth - 32, 280);
  }, []);

  const preventContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  const renderAllPages = useCallback(async (pdf, zoomLevel, { showRerendering = false } = {}) => {
    const container = pagesContainerRef.current;
    if (!container || !pdf) return 0;

    if (showRerendering) setIsRerendering(true);
    container.innerHTML = '';

    const total = pdf.numPages;
    const width = getContainerWidth();

    for (let pageNum = 1; pageNum <= total; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const canvas = await renderPageToCanvas(page, width, zoomLevel);
      canvas.setAttribute('data-page', String(pageNum));
      container.appendChild(canvas);
      setRenderedPages(pageNum);
    }

    if (showRerendering) setIsRerendering(false);
    return total;
  }, [getContainerWidth]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (!url) {
      setStatus('error');
      setErrorMessage('No document URL was provided.');
      return undefined;
    }

    if (isPlaceholderUrl(url)) {
      setStatus('error');
      setErrorMessage(
        'This material is not available yet. Ask your instructor to upload the PDF.',
      );
      return undefined;
    }

    let cancelled = false;
    readyRef.current = false;
    pdfDocRef.current = null;
    prevZoomRef.current = null;
    setStatus('loading');
    setErrorMessage('');
    setPageCount(0);
    setRenderedPages(0);
    setZoom(ZOOM_DEFAULT);

    const timeoutId = setTimeout(() => {
      if (!cancelled && !readyRef.current) {
        setStatus('error');
        setErrorMessage('This document took too long to open. Please try again.');
      }
    }, LOAD_TIMEOUT_MS);

    const openDocument = async () => {
      try {
        const pdfData = await loadPdfForViewing(url);
        if (cancelled) return;

        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        if (cancelled) {
          await pdf.destroy();
          return;
        }

        pdfDocRef.current = pdf;
        setPageCount(pdf.numPages);

        const count = await renderAllPages(pdf, ZOOM_DEFAULT);
        if (cancelled) return;

        readyRef.current = true;
        setRenderedPages(count);
        prevZoomRef.current = ZOOM_DEFAULT;
        setStatus('ready');
        clearTimeout(timeoutId);
      } catch (err) {
        if (cancelled) return;
        console.warn('[PdfViewer] open failed', err);
        clearTimeout(timeoutId);
        setStatus('error');
        setErrorMessage('Unable to open this document. Please try again later.');
      }
    };

    const frameId = requestAnimationFrame(() => {
      openDocument();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
      if (pagesContainerRef.current) {
        pagesContainerRef.current.innerHTML = '';
      }
    };
  }, [url, renderAllPages]);

  useEffect(() => {
    if (status !== 'ready' || !pdfDocRef.current) return undefined;
    if (prevZoomRef.current === null) {
      prevZoomRef.current = zoom;
      return undefined;
    }
    if (prevZoomRef.current === zoom) return undefined;
    prevZoomRef.current = zoom;

    const timer = setTimeout(async () => {
      try {
        await renderAllPages(pdfDocRef.current, zoom, { showRerendering: true });
      } catch (err) {
        console.warn('[PdfViewer] zoom render failed', err);
        setIsRerendering(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [zoom, status, renderAllPages]);

  const changeZoom = useCallback((delta) => {
    setZoom((current) => clampZoom(current + delta));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(ZOOM_DEFAULT);
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        active: true,
        startDistance: getTouchDistance(e.touches),
        startZoom: zoomRef.current,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!pinchRef.current.active || e.touches.length !== 2) return;
    e.preventDefault();
    const distance = getTouchDistance(e.touches);
    const scale = distance / pinchRef.current.startDistance;
    setZoom(clampZoom(pinchRef.current.startZoom * scale));
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchRef.current.active = false;
  }, []);

  const zoomPercent = Math.round(zoom * 100);
  const isRenderingMore = status === 'ready' && pageCount > 0 && renderedPages < pageCount;

  const handleDownload = useCallback(() => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = title ? `${title}.pdf` : 'course-material.pdf';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [url, title]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-background flex flex-col select-none"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          ...READ_ONLY_STYLE,
        }}
        onContextMenu={preventContextMenu}
      >
        <div className="flex items-center gap-2 px-3 py-3 border-b border-border bg-card shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full shrink-0"
            aria-label="Close document"
          >
            <X className="h-5 w-5" />
          </Button>

          <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
            {title || 'Course Material'}
            {pageCount > 0 && (
              <span className="text-muted-foreground font-normal">
                {' '}
                · {pageCount} page{pageCount !== 1 ? 's' : ''}
              </span>
            )}
          </span>

          {allowDownload && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-9 w-9 rounded-full shrink-0"
              aria-label="Download document"
              disabled={status !== 'ready'}
            >
              <Download className="h-5 w-5" />
            </Button>
          )}

          <div className="flex items-center gap-0.5 shrink-0 rounded-full border border-border bg-muted/40 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => changeZoom(-ZOOM_STEP)}
              disabled={zoom <= ZOOM_MIN || status !== 'ready'}
              className="h-8 w-8 rounded-full"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={resetZoom}
              disabled={status !== 'ready'}
              className="text-xs font-medium text-foreground min-w-[3rem] text-center px-1 disabled:opacity-50"
              aria-label="Reset zoom"
            >
              {zoomPercent}%
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => changeZoom(ZOOM_STEP)}
              disabled={zoom >= ZOOM_MAX || status !== 'ready'}
              className="h-8 w-8 rounded-full"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-auto min-h-0 bg-muted/30 overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch', ...READ_ONLY_STYLE }}
            onContextMenu={preventContextMenu}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <div
              ref={pagesContainerRef}
              className="flex flex-col items-center p-4 min-h-full w-max min-w-full mx-auto"
              onContextMenu={preventContextMenu}
            />
          </div>

          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Opening document…</p>
              </div>
            </div>
          )}

          {(isRenderingMore || isRerendering) && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1.5 shadow-md text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isRerendering ? 'Updating view…' : 'Loading pages…'}
            </div>
          )}
        </div>

        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-background">
            <div className="text-center space-y-4 max-w-sm">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Go Back
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}