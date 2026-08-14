// Shared constants for the Card System & Hand Tracking feature.

export const CATEGORIES = [
  'Year',
  '2468',
  'Like #s',
  'Addition',
  'Quints',
  'Consec Run',
  '13579',
  'Winds/Dragons',
  '369',
  'Singles/Pairs',
];

export const WIN_TYPES = ['Self Drawn', 'Thrown', 'Jokerless'];

export const SIDE_OPTIONS = [
  { value: 'none', label: 'Single' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

export function sideShort(side) {
  if (side === 'left') return 'L';
  if (side === 'right') return 'R';
  return '';
}

export function lineLabel(hand) {
  const s = sideShort(hand.side);
  return s ? `${hand.position}${s}` : `${hand.position}`;
}

export function concealedLabel(hand) {
  return hand.concealed_exposed === 'C' ? 'Concealed' : 'Exposed';
}