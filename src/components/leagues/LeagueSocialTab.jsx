import React, { useState, useEffect } from 'react';
import { me as authMe } from '@/services/authApi';
import { leaguePosts as leaguePostsApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Pin, Trash2, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

export default function LeagueSocialTab({ league }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    authMe().then(setUser).catch(() => {});
  }, []);

  const { data: posts = [] } = useQuery({
    queryKey: ['league-posts', league.id],
    queryFn: () => leaguePostsApi.filter({ league_id: league.id }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['league-posts', league.id] });

  const createMutation = useMutation({
    mutationFn: (data) => leaguePostsApi.create(data),
    onSuccess: () => { invalidate(); setContent(''); },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => leaguePostsApi.remove(id),
    onSuccess: invalidate,
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }) => leaguePostsApi.update(id, { pinned }),
    onSuccess: invalidate,
  });

  const handlePost = () => {
    if (!content.trim()) return;
    createMutation.mutate({
      league_id: league.id,
      content: content.trim(),
      author_id: user?.id || '',
      author_name: user?.full_name || 'Anonymous',
      author_email: user?.email || '',
    });
  };

  const isAdmin = user?.role === 'admin';
  const sorted = [...posts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.created_date < b.created_date ? 1 : -1;
  });

  return (
    <div className="space-y-4">
      {/* Post composer */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <Textarea
          placeholder="Share something with the league…"
          value={content}
          onChange={e => setContent(e.target.value)}
          className="resize-none"
          rows={3}
        />
        <div className="flex justify-end">
          <Button size="sm" className="gap-2" onClick={handlePost} disabled={createMutation.isPending || !content.trim()}>
            <Send className="h-3.5 w-3.5" /> Post
          </Button>
        </div>
      </div>

      {/* Posts */}
      {sorted.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No posts yet. Be the first to share something!</p>
        </div>
      )}

      {sorted.map(post => (
        <div key={post.id} className={`bg-white border rounded-xl p-4 ${post.pinned ? 'border-amber-300 bg-amber-50/30' : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                {post.author_name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">{post.author_name}</span>
                  {post.pinned && <Badge className="bg-amber-100 text-amber-700 gap-1 text-xs"><Pin className="h-2.5 w-2.5" /> Pinned</Badge>}
                  <span className="text-xs text-slate-400">{post.created_date ? format(new Date(post.created_date), 'MMM d, h:mm a') : ''}</span>
                </div>
                <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{post.content}</p>
              </div>
            </div>
            {(isAdmin || post.author_id === user?.id) && (
              <div className="flex items-center gap-1 shrink-0">
                {isAdmin && (
                  <button onClick={() => pinMutation.mutate({ id: post.id, pinned: !post.pinned })} className={`p-1.5 rounded-lg transition-colors ${post.pinned ? 'text-amber-500 hover:text-amber-700' : 'text-slate-300 hover:text-amber-500'}`}>
                    <Pin className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => { if (confirm('Delete post?')) deleteMutation.mutate(post.id); }} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}