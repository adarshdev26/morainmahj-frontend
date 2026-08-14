import { post } from '@/services/http';

/**
 * Named REST actions.
 * POST /api/actions/<kebab-name> with JSON body → response body.
 *
 * callAction returns the bare JSON body.
 */

function toKebab(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function actionPath(name) {
  return `/api/actions/${toKebab(name)}`;
}

/** Preferred: post to named action, return body. */
export async function callAction(name, body = {}, options = {}) {
  return post(actionPath(name), body, options);
}

const ACTION_NAMES = [
  'assignLeagueSubstitute',
  'cancelSubscription',
  'checkAuctionCard',
  'confirmCoursePayment',
  'confirmLeaguePayment',
  'confirmRegistration',
  'confirmTournamentPayment',
  'courseCheckout',
  'createBillingPortal',
  'createCoursePaymentIntent',
  'createLeaguePaymentIntent',
  'createLeagueWalkIn',
  'createSubscriptionCheckout',
  'createTournamentPaymentIntent',
  'deleteAccount',
  'deleteLeagueCascade',
  'drawRaffle',
  'drawTRaffle',
  'finalizeLeagueSession',
  'finalizeMatchResult',
  'generateLeagueAssignments',
  'generateShareToken',
  'getDemoTournamentForUser',
  'getLeagueRoster',
  'getPlayerRepository',
  'getPublicCourseWebsite',
  'getPublicLeaderboard',
  'getPublicLeagueLeaderboard',
  'getPublicLeagueWebsite',
  'getPublicTournamentWebsite',
  'getRaffleAllocations',
  'getTournamentPlayerNames',
  'invitePlayer',
  'leagueCheckout',
  'leagueJoin',
  'lockInAuctionWinners',
  'logDataAccess',
  'logHand',
  'markCourseEnrollmentPaid',
  'markLeagueMemberPaid',
  'notifyCourseEnrollment',
  'notifyLeaguePrizePayout',
  'notifyPrizePayOut',
  'notifyTournamentRegistration',
  'placeSilentAuctionBid',
  'processLeagueRefund',
  'promoteFromWaitlistCourse',
  'qrCheckIn',
  'raffleCheckout',
  'recalculateLeagueWaitlist',
  'requestLeagueSubstitute',
  'respondToMatchResult',
  'saveAuctionCard',
  'selfRegister',
  'sendBulkEmails',
  'sendBulkSMS',
  'sendLeagueBulkSMS',
  'sendLeagueInvites',
  'sendPushNotification',
  'startTrial',
  'stripeCheckout',
  'submitMatchResult',
  'syncOneSignalIdentity',
  'verifyCoursePayment',
  'verifySubscriptionPayment',
  'verifyTournamentPayment',
];

/** Named helpers: actions.getDemoTournamentForUser({}) */
export const actions = Object.fromEntries(
  ACTION_NAMES.map((name) => [name, (body, options) => callAction(name, body, options)]),
);

export default actions;
