import React, { useState } from 'react';
import { blockedUsers as blockedUsersApi, communityComments as communityCommentsApi, communityPosts as communityPostsApi } from '@/services/resources';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Trash2, Pin, ChevronDown, ChevronUp, Send, Loader2, Flag, UserX, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { haptics } from '@/lib/haptics';
import ReportModal from './ReportModal';
import { toast } from 'sonner';

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

export default function PostCard({ post, currentUser, isAdmin, onDeleted, onPinToggled }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const queryClient = useQueryClient();

  const blockMutation = useMutation({
    mutationFn: () => blockedUsersApi.create({
      blocker_id: currentUser.id,
      blocker_email: currentUser.email,
      blocked_id: post.author_id,
      blocked_email: post.author_email,
      blocked_name: post.author_name,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      toast.success(`${post.author_name} has been blocked.`);
      setShowMenu(false);
    },
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['community-comments', post.id],
    queryFn: () => communityCommentsApi.filter({ post_id: post.id }),
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const likes = post.likes || [];
      const uid = currentUser?.id;
      const already = likes.includes(uid);
      return communityPostsApi.update(post.id, {
        likes: already ? likes.filter(id => id !== uid) : [...likes, uid],
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => communityPostsApi.update(post.id, { deleted: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['community-posts'] }); onDeleted?.(); },
  });

  const pinMutation = useMutation({
    mutationFn: () => communityPostsApi.update(post.id, { pinned: !post.pinned }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['community-posts'] }); onPinToggled?.(); },
  });

  const submitComment = async () => {
    if (!commentText.trim()) return;
    haptics.light();
    setSubmittingComment(true);
    await communityCommentsApi.create({
      post_id: post.id,
      author_id: currentUser.id,
      author_name: currentUser.full_name || currentUser.email,
      author_email: currentUser.email,
      content: commentText.trim(),
      deleted: false,
    });
    setCommentText('');
    setSubmittingComment(false);
    refetchComments();
  };

  const isLiked = (post.likes || []).includes(currentUser?.id);
  const canDelete = isAdmin || post.author_id === currentUser?.id;
  const isOwnPost = post.author_id === currentUser?.id;

  const activeComments = comments.filter(c => !c.deleted);

  return (
    <div className={`bg-card border rounded-xl overflow-hidden ${post.pinned ? 'border-primary/40 ring-1 ring-primary/20' : ''}`}>
      {post.pinned && (
        <div className="bg-primary/5 px-4 py-1.5 flex items-center gap-1.5 text-xs text-primary font-semibold border-b border-primary/10">
          <Pin className="h-3 w-3" /> Pinned
        </div>
      )}
      <div className="p-4">
        {/* Author row */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar name={post.author_name} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground leading-tight">{post.author_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(s => !s)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-10 bg-card border border-border rounded-xl shadow-lg py-1 w-44" onMouseLeave={() => setShowMenu(false)}>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => { pinMutation.mutate(); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                    >
                      <Pin className="h-3.5 w-3.5" /> {post.pinned ? 'Unpin' : 'Pin post'}
                    </button>
                    <button
                      onClick={() => { haptics.warning(); deleteMutation.mutate(); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete post
                    </button>
                  </>
                )}
                {!isAdmin && canDelete && (
                  <button
                    onClick={() => { haptics.warning(); deleteMutation.mutate(); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete post
                  </button>
                )}
                {!isOwnPost && (
                  <>
                    <button
                      onClick={() => { setShowReport(true); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-amber-600"
                    >
                      <Flag className="h-3.5 w-3.5" /> Report post
                    </button>
                    <button
                      onClick={() => { haptics.warning(); blockMutation.mutate(); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-destructive"
                    >
                      <UserX className="h-3.5 w-3.5" /> Block user
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mb-3">{post.content}</p>

        {/* Photo */}
        {post.photo_url && (
          <div className="mb-3 rounded-xl overflow-hidden border">
            <img
              src={post.photo_url}
              alt="post"
              className="w-full max-h-96 object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-1 pt-1 border-t border-border/60">
          <button
            onClick={() => { haptics.light(); likeMutation.mutate(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isLiked ? 'text-red-500 bg-red-50' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            {(post.likes || []).length > 0 && (post.likes || []).length}
          </button>

          <button
            onClick={() => setShowComments(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            {activeComments.length > 0 ? activeComments.length : ''}
            {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-3 pt-3 border-t border-border/60 space-y-3">
            {activeComments.map(comment => (
              <div key={comment.id} className="flex gap-2.5">
                <Avatar name={comment.author_name} />
                <div className="flex-1 bg-muted/40 rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">{comment.author_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{comment.content}</p>
                </div>
                {(isAdmin || comment.author_id === currentUser?.id) && (
                  <button
                    onClick={async () => {
                      haptics.light();
                      await communityCommentsApi.update(comment.id, { deleted: true });
                      refetchComments();
                    }}
                    className="self-start p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Comment composer */}
            {currentUser && (
              <div className="flex gap-2.5 items-start">
                <Avatar name={currentUser.full_name || currentUser.email} />
                <div className="flex-1 flex gap-2">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                    placeholder="Write a comment…"
                    className="flex-1 bg-muted/40 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary/30"
                  />
                  <button
                    onClick={submitComment}
                    disabled={!commentText.trim() || submittingComment}
                    className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    {submittingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {showReport && (
        <ReportModal
          open={showReport}
          onClose={() => setShowReport(false)}
          currentUser={currentUser}
          contentType="post"
          contentId={post.id}
          contentPreview={post.content}
          reportedUserId={post.author_id}
          reportedUserName={post.author_name}
        />
      )}
    </div>
  );
}