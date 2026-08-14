import React, { useRef, useState } from 'react';
import { uploadFile } from '@/services/integrationsApi';
import { Upload, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Reusable image upload component.
 * Uploads the file via the platform UploadFile integration and returns the file_url.
 *
 * @param {string} value        - Current image URL (or null/empty)
 * @param {function} onChange   - Called with the new file_url string (or null on remove)
 * @param {number} previewSize  - Preview box size in px (default 64)
 * @param {string} label        - Optional label text
 */
export default function ImageUpload({ value, onChange, previewSize = 64, label = 'Logo' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    setError(null);

    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please use JPG, PNG, GIF, or WebP.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('Image must be 5MB or smaller.');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      onChange(file_url);
    } catch (err) {
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-slate-700">{label}</p>}
      <div className="flex items-center gap-3">
        <div
          className="relative rounded-xl border-2 border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden"
          style={{ width: previewSize, height: previewSize }}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : value ? (
            <>
              <img src={value} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground/50" />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
              uploading
                ? 'border-border text-muted-foreground cursor-not-allowed'
                : 'border-border hover:bg-accent text-foreground'
            )}
          >
            {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          </button>
          <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP · max 5MB</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}