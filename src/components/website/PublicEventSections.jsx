import React, { useState } from 'react';
import { FileText, Image as ImageIcon, File, Download, ExternalLink, X } from 'lucide-react';

function getFileIcon(url) {
  const ext = (url.split('.').pop() || '').toLowerCase().split('?')[0];
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return ImageIcon;
  if (['pdf'].includes(ext)) return FileText;
  return File;
}

function getFileType(url) {
  const ext = (url.split('.').pop() || '').toLowerCase().split('?')[0];
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'Image';
  if (['pdf'].includes(ext)) return 'PDF';
  if (['doc', 'docx'].includes(ext)) return 'Word';
  if (['xls', 'xlsx'].includes(ext)) return 'Excel';
  return 'File';
}

export default function PublicEventSections({ entity }) {
  const aboutContent = entity.website_about_content;
  const galleryImages = entity.website_gallery_images || [];
  const documents = (entity.website_documents || []).filter(d => d.file_url);

  const [lightbox, setLightbox] = useState(null);

  const hasAbout = aboutContent && aboutContent.trim() && aboutContent.replace(/<[^>]*>/g, '').trim();
  const hasGallery = galleryImages.length > 0;
  const hasDocs = documents.length > 0;

  if (!hasAbout && !hasGallery && !hasDocs) return null;

  return (
    <>
      {hasAbout && (
        <section id="about">
          <h2 className="text-2xl font-bold mb-3">About</h2>
          <div
            className="prose prose-sm max-w-none text-slate-600 [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_p]:leading-relaxed [&_p]:mb-2"
            dangerouslySetInnerHTML={{ __html: aboutContent }}
          />
        </section>
      )}

      {hasGallery && (
        <section id="gallery">
          <h2 className="text-2xl font-bold mb-3">Gallery</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {galleryImages.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightbox(url)}
                className="relative rounded-xl overflow-hidden border bg-slate-50 aspect-square group cursor-zoom-in"
              >
                <img
                  src={url}
                  alt={`Gallery ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {hasDocs && (
        <section id="documents">
          <h2 className="text-2xl font-bold mb-3">More Information</h2>
          <div className="space-y-2">
            {documents.map((doc, i) => {
              const Icon = getFileIcon(doc.file_url);
              return (
                <div key={i} className="flex items-center gap-3 bg-white border rounded-xl p-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">{doc.title || 'Untitled Document'}</p>
                    <p className="text-xs text-slate-400">{getFileType(doc.file_url)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-slate-50 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </a>
                    <a
                      href={doc.file_url}
                      download
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: 'var(--brand)' }}
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors">
            <X className="h-5 w-5" />
          </button>
          <img src={lightbox} alt="Gallery" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}