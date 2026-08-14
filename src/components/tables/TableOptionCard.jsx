import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

const WINDS = ['East', 'South', 'West', 'North'];
const WIND_COLORS = {
  East: 'bg-red-100 text-red-700',
  South: 'bg-blue-100 text-blue-700',
  West: 'bg-green-100 text-green-700',
  North: 'bg-amber-100 text-amber-700',
};

export default function TableOptionCard({ option, optionIndex, players, onSelect, isSelected }) {
  const getPlayer = (id) => players.find(p => p.id === id);

  // Calculate repeat pairings from previous rounds for this option
  const repeatCount = option.repeatCount || 0;

  return (
    <Card className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base">Option {optionIndex + 1}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={repeatCount === 0 ? 'default' : 'secondary'} className="text-xs">
              {repeatCount === 0 ? '✓ No repeats' : `${repeatCount} repeat${repeatCount > 1 ? 's' : ''}`}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{option.tables.length} tables · {option.tables.reduce((sum, t) => sum + t.players.filter(Boolean).length, 0)} players seated</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {option.tables.map((table) => (
            <div key={table.table_number} className="rounded-lg border bg-muted/20 p-2">
              <p className="text-xs font-semibold mb-1.5 text-muted-foreground">Table {table.table_number}</p>
              <div className="space-y-1">
                {WINDS.map((wind, idx) => {
                  const player = getPlayer(table.players[idx]);
                  return (
                    <div key={wind} className="flex items-center gap-1.5 text-xs">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium w-12 text-center flex-shrink-0 ${WIND_COLORS[wind]}`}>{wind}</span>
                      <span className="truncate">{player?.name || <span className="text-muted-foreground italic">Empty</span>}</span>
                      {player?.flight && <Badge variant="outline" className="text-[8px] py-0 px-1 ml-auto flex-shrink-0">{player.flight}</Badge>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <Button
          className="w-full gap-2"
          variant={isSelected ? 'default' : 'outline'}
          onClick={() => onSelect(option)}
        >
          {isSelected && <CheckCircle2 className="h-4 w-4" />}
          {isSelected ? 'Selected' : 'Use This Option'}
        </Button>
      </CardContent>
    </Card>
  );
}