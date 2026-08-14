import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';

const VARIANT_PRESETS = {
  nmjl: {
    label: 'Strict NMJL',
    description: 'Official National Mah Jongg League standard rules with no modifications.',
    template: `National Mah Jongg League (NMJL) Official Rules

Scoring:
- Points awarded based on NMJL Official Hand Rankings
- East player dealer status affects scoring
- No wild tiles allowed unless specified in special hands

Winning Hand:
- Must match one of the official hands on the current year's NMJL card
- Limit hands only (no consecutive or pung scoring)
- Bonus points for limit hands

Gameplay:
- Standard East-South-West-North wind order
- Player rotation between rounds
- No modifications to official NMJL rules
`
  },
  nmjl_tl: {
    label: 'NMJL Compliant with Local Rules',
    description: 'NMJL standard with local/tournament additions that are fully NMJL-compliant (no rule subtractions).',
    template: `NMJL Compliant with Local/Tournament Rules

Base Rules:
- All official NMJL rules and scoring apply as the foundation
- No subtractions from or contradictions to NMJL rules

Local Additions & Modifications (NMJL-Compliant):
- [Add specific local bonuses, house scoring variations, or additions here]
- Example: Special bonus points for specific hands
- Example: Additional dress code or conduct requirements
- Example: Tournament-specific tiebreaker procedures

Winning Hand:
- Must match official NMJL hands (base requirement)
- Local bonuses may apply on top of NMJL scoring

Gameplay:
- Standard NMJL gameplay as baseline
- Local modifications: [specify if East stays or rotates, any other variations]
- All additions are made within NMJL framework

Note: All rules are additive to NMJL standards, not subtractive.
`
  },
  nmjl_custom: {
    label: 'Other/Custom Rules',
    description: 'Non-NMJL rules or significantly modified variant.',
    template: `Custom/Alternative Mah Jongg Rules

Scoring System:
- [Define your scoring system]

Winning Conditions:
- [Specify what constitutes a winning hand]

Special Hands:
- [List any special hand bonuses]

Penalties & Disqualifications:
- [List penalties and DQ conditions]

Gameplay Variations:
- [Detail any non-standard gameplay rules]

Tiebreakers:
- [Explain how ties are resolved]
`
  }
};

export default function RulesEditor({ variant = 'nmjl', rulesDescription = '', onChange }) {
  const [selectedVariant, setSelectedVariant] = useState(variant);
  const [description, setDescription] = useState(rulesDescription);

  const handleVariantChange = (newVariant) => {
    setSelectedVariant(newVariant);
    // Optionally auto-fill template, but keep user's custom text if they've edited
    if (!description || description === VARIANT_PRESETS[variant]?.template) {
      setDescription(VARIANT_PRESETS[newVariant].template);
    }
    onChange({ variant: newVariant, description });
  };

  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    setDescription(text);
    onChange({ variant: selectedVariant, description: text });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Rules & Scoring Guidelines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Rules Variant
          </label>
          <Select value={selectedVariant} onValueChange={handleVariantChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VARIANT_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">
            {VARIANT_PRESETS[selectedVariant]?.description}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              Detailed Rules & Scoring
            </label>
            <Badge variant="outline" className="text-xs">
              {description.split('\n').filter(l => l.trim()).length} lines
            </Badge>
          </div>
          <Textarea
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Enter your rules, scoring guidelines, and house rules here..."
            className="font-mono text-xs h-64"
          />
          <p className="text-xs text-slate-500 mt-1">
            This will be displayed to players on the tournament/league landing page so they understand how scoring works.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-700 mb-2">Preview:</p>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-mono">
            {description || '(No rules defined)'}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}