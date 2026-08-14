import React from 'react';
import { blockedUsers as blockedUsersApi, communityPosts as communityPostsApi } from '@/services/resources';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, MessageSquareDashed } from 'lucide-react';
import ConductRulesGate from './ConductRulesGate';
import PostComposer from './PostComposer';
import PostCard from './PostCard';
import ModerationPanel from './ModerationPanel';

/**
 * contextType: 'tournament' | 'league' | 'course'
 * contextId: the entity ID
 * isEnrolled: boolean — true if this user has a confirmed registration/enrollment/membership
 * isAdmin: boolean
 */
export default function CommunityFeed({ contextType, contextId, isEnrolled, isAdmin }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['community-posts', contextType, contextId],
    queryFn: () =>
      communityPostsApi.filter({ context_type: contextType, context_id: contextId }),
    enabled: !!contextId,
    refetchInterval: 30000,
  });

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: () => blockedUsersApi.filter({ blocker_id: user?.id }),
    enabled: !!user?.id,
  });

  const blockedIds = new Set(blockedUsers.map(b => b.blocked_id));

  const visiblePosts = posts
    .filter(p => !p.deleted && !blockedIds.has(p.author_id))
    .sort((a, b) => {
      // Pinned first, then newest
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_date) - new Date(a.created_date);
    });

  const canPost = isAdmin || isEnrolled;

  if (!user) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Please sign in to access the community.
      </div>
    );
  }

  return (
    <ConductRulesGate user={user} contextType={contextType} contextId={contextId}>
      <div className="space-y-4">
        {isAdmin && (
          <div className="mb-6">
            <ModerationPanel />
            <hr className="my-6 border-border" />
          </div>
        )}
        {canPost ? (
          <PostComposer
            user={user}
            contextType={contextType}
            contextId={contextId}
            onPosted={() => queryClient.invalidateQueries({ queryKey: ['community-posts', contextType, contextId] })}
          />
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
            Only confirmed participants can post. View-only access is available to all.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquareDashed className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          visiblePosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={user}
              isAdmin={isAdmin}
              onDeleted={() => queryClient.invalidateQueries({ queryKey: ['community-posts', contextType, contextId] })}
              onPinToggled={() => queryClient.invalidateQueries({ queryKey: ['community-posts', contextType, contextId] })}
            />
          ))
        )}
      </div>
    </ConductRulesGate>
  );
}