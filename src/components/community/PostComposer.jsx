import React, { useState, useRef } from 'react';
import { uploadFile } from '@/services/integrationsApi';
import { communityPosts as communityPostsApi } from '@/services/resources';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image, Loader2, X, Send } from 'lucide-react';
import { haptics } from '@/lib/haptics';

export default function PostComposer({ user, contextType, contextId, onPosted }) {
  const [content, setContent] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    haptics.medium();
    setSubmitting(true);
    let photo_url = null;
    if (photoFile) {
      const { file_url } = await uploadFile({ file: photoFile });
      photo_url = file_url;
    }
    await communityPostsApi.create({
      context_type: contextType,
      context_id: contextId,
      author_id: user.id,
      author_name: user.full_name || user.email,
      author_email: user.email,
      content: content.trim(),
      photo_url,
      likes: [],
      pinned: false,
      deleted: false,
    });
    setContent('');
    clearPhoto();
    setSubmitting(false);
    haptics.success();
    onPosted?.();
  };

  return (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      <Textarea
        placeholder="Share something with the community… photos encouraged! 📸"
        value={content}
        onChange={e => setContent(e.target.value)}
        className="resize-none min-h-[80px] text-sm"
      />
      {photoPreview && (
        <div className="relative inline-block">
          <img src={photoPreview} alt="preview" className="h-32 w-auto rounded-lg object-cover border" />
          <button
            onClick={clearPhoto}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => fileRef.current.click()}
          >
            <Image className="h-4 w-4" /> Add Photo
          </Button>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={!content.trim() || submitting}
          onClick={handleSubmit}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Post
        </Button>
      </div>
    </div>
  );
}