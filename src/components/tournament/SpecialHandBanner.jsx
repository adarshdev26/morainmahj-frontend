import React from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function SpecialHandBanner({ specialHand }) {
  if (!specialHand || !specialHand.active) return null;

  const renderColorCodedDescription = (desc, tiles) => {
    if (!desc || !tiles) return desc;
    
    const tileMap = {};
    tiles.forEach(tile => {
      if (!tileMap[tile.identifier]) {
        tileMap[tile.identifier] = tile.color;
      }
    });

    const isLightColor = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 200;
    };

    return desc.split('').map((char, i) => {
      const color = tileMap[char];
      if (color) {
        const displayColor = isLightColor(color) ? '#3B82F6' : color;
        return (
          <span key={i} style={{ color: displayColor, fontWeight: 'bold' }}>
            {char}
          </span>
        );
      }
      return char;
    });
  };

  return (
    <Card className="border-2 border-amber-400 bg-amber-50 dark:bg-amber-950 dark:border-amber-600 mb-4 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 dark:text-amber-100">{specialHand.name}</h3>
              {specialHand.description && (
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  {renderColorCodedDescription(specialHand.description, specialHand.tiles)}
                  {specialHand.comment && <span className="ml-1">({specialHand.comment})</span>}
                </p>
              )}
            </div>
          </div>
          {specialHand.point_value && (
            <div className="text-right">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">Points</p>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-100">{specialHand.point_value}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}