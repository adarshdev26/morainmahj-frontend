import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function InviteBatchPreview({ selected, availablePlayers, search, filterActivity, filterTournament, allTournaments }) {
  const selectionRate = availablePlayers.length > 0 ? ((selected.length / availablePlayers.length) * 100).toFixed(1) : 0;
  const tournamentName = allTournaments.find(t => t.id === filterTournament)?.name;

  const getActivityLabel = () => {
    if (filterActivity === 'played') return 'Have played in tournaments';
    if (filterActivity === 'confirmed') return 'Have confirmed registrations';
    if (filterActivity === 'registered') return 'Have registered';
    return 'Everyone with a profile';
  };

  return (
    <Card className="mb-6 border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {selected.length > 0 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-slate-400" />}
          Batch Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Current Filters</p>
            <div className="flex flex-wrap gap-2">
              {search && (
                <Badge variant="outline" className="bg-blue-50">
                  Search: "{search}"
                </Badge>
              )}
              <Badge variant="outline" className="bg-amber-50">
                {getActivityLabel()}
              </Badge>
              {filterTournament !== 'all' && (
                <Badge variant="outline" className="bg-green-50">
                  Played: {tournamentName}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t">
            <div>
              <p className="text-sm font-semibold text-slate-800">{availablePlayers.length}</p>
              <p className="text-xs text-slate-500">Players matching filters</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{selected.length}</p>
              <p className="text-xs text-slate-500">Selected to invite</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{selectionRate}%</p>
              <p className="text-xs text-slate-500">Selection rate</p>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-slate-500 mb-2">Selected players:</p>
              <div className="flex flex-wrap gap-1">
                {selected.slice(0, 8).map(p => (
                  <Badge key={p.id} variant="secondary" className="text-xs">
                    {p.name.split(' ')[0]}
                  </Badge>
                ))}
                {selected.length > 8 && (
                  <Badge variant="outline" className="text-xs">
                    +{selected.length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}