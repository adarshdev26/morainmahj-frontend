import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, MapPin, Wind, Package } from 'lucide-react';

const WINDS = ['East', 'South', 'West', 'North'];
const WIND_COLORS = {
  East: 'bg-red-100 text-red-700 border-red-200',
  South: 'bg-blue-100 text-blue-700 border-blue-200',
  West: 'bg-green-100 text-green-700 border-green-200',
  North: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function CheckInStatus({ registration, assignments, userId }) {
  if (!registration) return null;

  const isCheckedIn = registration.checked_in;

  // Build per-round assignments for this player
  const playerIdKeys = ['player1_id', 'player2_id', 'player3_id', 'player4_id'];
  const myRounds = [];

  if (assignments?.length) {
    const myAssignments = assignments
      .filter(a => playerIdKeys.some(k => a[k] === userId))
      .sort((a, b) => a.round_number - b.round_number);

    myAssignments.forEach(a => {
      const seatIdx = playerIdKeys.findIndex(k => a[k] === userId);
      myRounds.push({
        round: a.round_number,
        table: a.table_number,
        wind: seatIdx >= 0 ? WINDS[seatIdx] : null,
      });
    });
  }

  const hasSetAssignment = registration.bringing_set && registration.set_table_number;

  return (
    <Card className={`mb-5 border-2 transition-all ${isCheckedIn ? 'border-emerald-300 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/30'}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCheckedIn ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {isCheckedIn
              ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              : <Clock className="h-5 w-5 text-amber-600" />
            }
          </div>
          <div className="flex-1">
            <p className={`font-semibold text-sm ${isCheckedIn ? 'text-emerald-800' : 'text-amber-800'}`}>
              {isCheckedIn ? "You're checked in!" : 'Not yet checked in'}
            </p>
            <p className={`text-xs mt-0.5 ${isCheckedIn ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isCheckedIn
                ? 'Your seat assignments are below.'
                : 'Please check in with the tournament director when you arrive.'}
            </p>

            {isCheckedIn && (
              <div className="mt-3 space-y-3">
                {/* Per-round seat assignments */}
                {myRounds.length > 0 ? (
                  <div className="space-y-2">
                    {myRounds.map(({ round, table, wind }) => (
                      <div key={round} className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500 w-16 flex-shrink-0">Round {round}</span>
                        <div className="flex items-center gap-1.5 bg-white border border-emerald-200 rounded-lg px-2.5 py-1">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          <span className="text-sm font-bold text-slate-800">Table {table}</span>
                        </div>
                        {wind && (
                          <Badge className={`${WIND_COLORS[wind]} border text-xs font-semibold`}>
                            <Wind className="h-3 w-3 mr-1" />
                            {wind}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 italic">Table assignments coming soon…</p>
                )}

                {/* Set assignment */}
                {hasSetAssignment && (
                  <div className="flex items-center gap-2 pt-1 border-t border-emerald-200 mt-1">
                    <Package className="h-4 w-4 text-violet-500 flex-shrink-0" />
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold text-violet-700">Bring your set to Table {registration.set_table_number}</span>
                      <span className="text-slate-500 ml-1">— thank you for volunteering!</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}