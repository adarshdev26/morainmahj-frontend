import React from 'react';
import { Clock } from 'lucide-react';

export default function CheckInGate({ tournamentName }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6 py-10">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <Clock className="h-8 w-8 text-amber-600" />
      </div>
      <h2 className="text-lg font-heading font-semibold mb-2">Check-In Required</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        {tournamentName
          ? `Please check in at ${tournamentName} to view your seating, scorecard, and room map.`
          : 'Please check in with the tournament director to view your seating, scorecard, and room map.'}
      </p>
    </div>
  );
}