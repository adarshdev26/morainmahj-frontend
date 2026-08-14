import React, { useState } from 'react';
import { communityAgreements as communityAgreementsApi, communityRules as communityRulesApi } from '@/services/resources';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ScrollText, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

/**
 * Gates the community forum behind a conduct rules acknowledgment.
 * If the user has already agreed, renders children directly.
 */
export default function ConductRulesGate({ user, contextType, contextId, children }) {
  const [checked, setChecked] = useState(false);
  const queryClient = useQueryClient();

  // Fetch applicable rules (context-specific OR global)
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['community-rules', contextType, contextId],
    queryFn: async () => {
      const all = await communityRulesApi.filter({ active: true });
      // prefer context-specific, fall back to global
      const specific = all.filter(r => r.context_type === contextType && r.context_id === contextId);
      return specific.length > 0 ? specific : all.filter(r => r.context_type === 'global');
    },
    enabled: !!user,
  });

  const { data: agreements = [], isLoading: agreeLoading } = useQuery({
    queryKey: ['community-agreement', user?.id, contextType, contextId],
    queryFn: () =>
      communityAgreementsApi.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const agreeMutation = useMutation({
    mutationFn: () =>
      communityAgreementsApi.create({
        user_id: user.id,
        user_email: user.email,
        context_type: contextType,
        context_id: contextId,
        agreed_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-agreement', user?.id, contextType, contextId] });
    },
  });

  if (!user) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Please sign in to access the community forum.
      </div>
    );
  }

  if (rulesLoading || agreeLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // Check if user has agreed for this context (or globally)
  const hasAgreed = agreements.some(
    a => (a.context_type === contextType && a.context_id === contextId) || a.context_type === 'global'
  );

  if (hasAgreed || rules.length === 0) {
    return children;
  }

  const rule = rules[0];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-primary/5 border-b px-6 py-5 flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-heading font-bold text-lg text-foreground">{rule.title}</h2>
            <p className="text-sm text-muted-foreground">Please read and accept before posting</p>
          </div>
        </div>
        <div className="px-6 py-5 max-h-96 overflow-y-auto">
          <div className="prose prose-sm max-w-none text-foreground">
            <ReactMarkdown>{rule.rules}</ReactMarkdown>
          </div>
        </div>
        <div className="px-6 py-4 border-t bg-muted/30 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border accent-primary cursor-pointer"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
            />
            <span className="text-sm text-foreground">
              I have read and agree to abide by the community conduct rules. I understand that violations may result in removal from the community.
            </span>
          </label>
          <Button
            className="w-full gap-2"
            disabled={!checked || agreeMutation.isPending}
            onClick={() => agreeMutation.mutate()}
          >
            {agreeMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : <><ShieldCheck className="h-4 w-4" /> I Agree — Enter Community</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}