import React, { useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { uploadFile } from '@/services/integrationsApi';
import { FileText, Trash2, Plus, Loader2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

export default function EventContentManager({ aboutContent, setAboutContent, galleryImages, setGalleryImages, documents, setDocuments }) {
  const { toast } = useToast();
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const imgInputRef = useRef(null);
  const docInputRef = useRef(null);

  // ── Gallery ──
  const handleGalleryUpload = async (file) => {
    if (!file) return;
    setUploadingImg(true);
    try {
      const { file_url } = await uploadFile({ file });
      setGalleryImages(arr => [...arr, file_url]);
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingImg(false);
    }
  };

  const moveImage = (i, dir) => {
    setGalleryImages(arr => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const newArr = [...arr];
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      return newArr;
    });
  };

  const removeImage = (i) => {
    setGalleryImages(arr => arr.filter((_, j) => j !== i));
  };

  // ── Documents ──
  const handleDocUpload = async (file) => {
    if (!file) return;
    setUploadingDoc(true);
    try {
      const { file_url } = await uploadFile({ file });
      setDocuments(arr => [...arr, { title: file.name.replace(/\.[^.]+$/, ''), file_url }]);
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingDoc(false);
    }
  };

  const updateDocTitle = (i, title) => {
    setDocuments(arr => arr.map((d, j) => j === i ? { ...d, title } : d));
  };

  const removeDoc = (i) => {
    setDocuments(arr => arr.filter((_, j) => j !== i));
  };

  return (
    <div className="space-y-6">
      {/* About Content */}
      <Card>
        <CardHeader><CardTitle>About Content</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 mb-3">Rich text description shown on the public website's About section.</p>
          <div className="quill-wrapper">
            <ReactQuill
              theme="snow"
              value={aboutContent}
              onChange={setAboutContent}
              modules={quillModules}
              placeholder="Write a detailed description about your event..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Gallery Images */}
      <Card>
        <CardHeader><CardTitle>Gallery Images</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {galleryImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {galleryImages.map((url, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border bg-slate-50 aspect-square">
                  <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center disabled:opacity-30 hover:bg-white">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === galleryImages.length - 1} className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center disabled:opacity-30 hover:bg-white">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeImage(i)} className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={e => { handleGalleryUpload(e.target.files?.[0]); e.target.value = ''; }} />
          <Button variant="outline" onClick={() => imgInputRef.current?.click()} disabled={uploadingImg} className="gap-1">
            {uploadingImg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {uploadingImg ? 'Uploading…' : 'Add Image'}
          </Button>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader><CardTitle>Flyers &amp; Documents</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-2 p-2 border rounded-lg">
                  <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                  <Input value={doc.title || ''} onChange={e => updateDocTitle(i, e.target.value)} placeholder="Document title" className="flex-1" />
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline shrink-0 flex items-center gap-0.5">
                    <ExternalLink className="h-3 w-3" /> View
                  </a>
                  <Button variant="outline" size="icon" onClick={() => removeDoc(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
          <input ref={docInputRef} type="file" className="hidden" onChange={e => { handleDocUpload(e.target.files?.[0]); e.target.value = ''; }} />
          <Button variant="outline" onClick={() => docInputRef.current?.click()} disabled={uploadingDoc} className="gap-1">
            {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {uploadingDoc ? 'Uploading…' : 'Add Document'}
          </Button>
          <p className="text-xs text-slate-400">PDF, images, and other supported files.</p>
        </CardContent>
      </Card>
    </div>
  );
}