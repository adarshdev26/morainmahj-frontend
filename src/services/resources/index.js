import { createResourceApi } from '@/services/resources/createResourceApi';

/**
 * Named REST resource clients. Paths match the Express resourceRegistry.
 * Usage:
 *   import { tournaments, registrations } from '@/services/resources';
 *   await tournaments.list({ status: 'upcoming' });
 *   await registrations.update(id, { status: 'confirmed' });
 */

export const auditLogs = createResourceApi('audit-logs');
export const blockedUsers = createResourceApi('blocked-users');
export const cardHands = createResourceApi('card-hands');
export const communicationLogs = createResourceApi('communication-logs');
export const communityAgreements = createResourceApi('community-agreements');
export const communityComments = createResourceApi('community-comments');
export const communityPosts = createResourceApi('community-posts');
export const communityRules = createResourceApi('community-rules');
export const contentReports = createResourceApi('content-reports');
export const courses = createResourceApi('courses');
export const courseEnrollments = createResourceApi('course-enrollments');
export const emailDeliveries = createResourceApi('email-deliveries');
export const emailTemplates = createResourceApi('email-templates');
export const faqs = createResourceApi('faqs');
export const handLogs = createResourceApi('hand-logs');
export const leagues = createResourceApi('leagues');
export const leagueMembers = createResourceApi('league-members');
export const leaguePosts = createResourceApi('league-posts');
export const leaguePrizes = createResourceApi('league-prizes');
export const leagueRoundTimers = createResourceApi('league-round-timers');
export const leagueRsvps = createResourceApi('league-rsvps');
export const leagueScoreCards = createResourceApi('league-score-cards');
export const leagueSessions = createResourceApi('league-sessions');
export const leagueTableAssignments = createResourceApi('league-table-assignments');
export const lessons = createResourceApi('lessons');
export const lessonFlightings = createResourceApi('lesson-flightings');
export const managers = createResourceApi('managers');
export const marketingFeatures = createResourceApi('marketing-features');
export const marketingPages = createResourceApi('marketing-pages');
export const marketingSections = createResourceApi('marketing-sections');
export const matchResults = createResourceApi('match-results');
export const organizations = createResourceApi('organizations');
export const players = createResourceApi('players');
export const prizeStructures = createResourceApi('prize-structures');
export const prizeWinners = createResourceApi('prize-winners');
export const raffles = createResourceApi('raffles');
export const raffleAllocations = createResourceApi('raffle-allocations');
export const rafflePrizeItems = createResourceApi('raffle-prize-items');
export const raffleTickets = createResourceApi('raffle-tickets');
export const registrations = createResourceApi('registrations');
export const roomMaps = createResourceApi('room-maps');
export const roundTimers = createResourceApi('round-timers');
export const scoreCards = createResourceApi('score-cards');
export const shareInvites = createResourceApi('share-invites');
export const silentAuctions = createResourceApi('silent-auctions');
export const silentAuctionBids = createResourceApi('silent-auction-bids');
export const silentAuctionItems = createResourceApi('silent-auction-items');
export const specialHands = createResourceApi('special-hands');
export const subscriptions = createResourceApi('subscriptions');
export const tableAssignments = createResourceApi('table-assignments');
export const teachingMaterials = createResourceApi('teaching-materials');
export const testimonials = createResourceApi('testimonials');
export const tournaments = createResourceApi('tournaments');
export const users = createResourceApi('users');

/** PascalCase entity name → resource client (for scripted migrations). */
export const byEntity = {
  AuditLog: auditLogs,
  BlockedUser: blockedUsers,
  CardHand: cardHands,
  CommunicationLog: communicationLogs,
  CommunityAgreement: communityAgreements,
  CommunityComment: communityComments,
  CommunityPost: communityPosts,
  CommunityRule: communityRules,
  ContentReport: contentReports,
  Course: courses,
  CourseEnrollment: courseEnrollments,
  EmailDelivery: emailDeliveries,
  EmailTemplate: emailTemplates,
  FAQ: faqs,
  HandLog: handLogs,
  League: leagues,
  LeagueMember: leagueMembers,
  LeaguePost: leaguePosts,
  LeaguePrize: leaguePrizes,
  LeagueRoundTimer: leagueRoundTimers,
  LeagueRSVP: leagueRsvps,
  LeagueScoreCard: leagueScoreCards,
  LeagueSession: leagueSessions,
  LeagueTableAssignment: leagueTableAssignments,
  Lesson: lessons,
  LessonFlighting: lessonFlightings,
  Manager: managers,
  MarketingFeature: marketingFeatures,
  MarketingPage: marketingPages,
  MarketingSection: marketingSections,
  MatchResult: matchResults,
  Organization: organizations,
  Player: players,
  PrizeStructure: prizeStructures,
  PrizeWinner: prizeWinners,
  Raffle: raffles,
  RaffleAllocation: raffleAllocations,
  RafflePrizeItem: rafflePrizeItems,
  RaffleTicket: raffleTickets,
  Registration: registrations,
  RoomMap: roomMaps,
  RoundTimer: roundTimers,
  ScoreCard: scoreCards,
  ShareInvite: shareInvites,
  SilentAuction: silentAuctions,
  SilentAuctionBid: silentAuctionBids,
  SilentAuctionItem: silentAuctionItems,
  SpecialHand: specialHands,
  Subscription: subscriptions,
  TableAssignment: tableAssignments,
  TeachingMaterial: teachingMaterials,
  Testimonial: testimonials,
  Tournament: tournaments,
  User: users,
};
