import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const VARIANT_LABELS = {
  nmjl: 'Strict NMJL',
  nmjl_tl: 'NMJL with T/L Rules',
  nmjl_custom: 'Custom Rules',
};

const VARIANT_COLORS = {
  nmjl: 'bg-blue-100 text-blue-800',
  nmjl_tl: 'bg-purple-100 text-purple-800',
  nmjl_custom: 'bg-amber-100 text-amber-800',
};

export default function RulesDisplay({ variant = 'nmjl', rulesDescription = '' }) {
  const [expanded, setExpanded] = useState(false);

  if (!rulesDescription) {
    return null;
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5" />
            Scoring Rules & Guidelines
          </CardTitle>
          <Badge className={VARIANT_COLORS[variant]}>
            {VARIANT_LABELS[variant] || variant}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <span className="font-medium text-slate-800">View Rules & Scoring Details</span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            )}
          </button>

          {expanded && (
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 overflow-x-auto max-h-96 overflow-y-auto font-mono whitespace-pre-wrap break-words leading-relaxed">
              {rulesDescription}
            </pre>
          )}
        </div>
      </CardContent>
    </Card>
  );
}