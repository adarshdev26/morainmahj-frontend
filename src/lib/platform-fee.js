import { PLAN_MAP } from '@/lib/subscriptionPlans';

/**
 * Returns the transaction fee percentage for a given subscription plan.
 * Defaults to 2.5% (Starter rate) if plan is unknown.
 */
export function getTransactionFeePct(planId) {
  return PLAN_MAP[planId]?.transaction_fee_pct ?? 2.5;
}

/**
 * Calculates the platform fee in cents for a given base amount and plan.
 * @param {number} baseAmountCents - The entry/membership fee in cents
 * @param {string} planId - The organizer's subscription plan ID
 * @returns {number} Platform fee in cents
 */
export function calculatePlatformFee(baseAmountCents, planId) {
  const pct = getTransactionFeePct(planId);
  return Math.round(baseAmountCents * pct / 100);
}

/**
 * Calculates the total amount (base + platform fee) in cents.
 */
export function calculateTotalWithFee(baseAmountCents, planId) {
  return baseAmountCents + calculatePlatformFee(baseAmountCents, planId);
}

/**
 * Formats a cents value as a dollar string.
 */
export function formatCents(cents) {
  if (!cents || cents <= 0) return '$0.00';
  return `$${(cents / 100).toFixed(2)}`;
}