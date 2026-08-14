/**
 * Mechanical migrator: base44.entities.X.* → @/services/resources *Api clients.
 *
 * Always imports as `{ tournaments as tournamentsApi }` to avoid shadowing
 * React Query `const { data: tournaments }` bindings.
 *
 * Usage:
 *   node scripts/migrate-entities-to-rest.mjs src/hooks/useHomeUpcomingEvents.js
 *   node scripts/migrate-entities-to-rest.mjs --all
 *
 * Does not touch functions/auth/integrations/subscribe. Re-run is mostly idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');

const ENTITY_TO_EXPORT = {
  AuditLog: 'auditLogs',
  BlockedUser: 'blockedUsers',
  CardHand: 'cardHands',
  CommunicationLog: 'communicationLogs',
  CommunityAgreement: 'communityAgreements',
  CommunityComment: 'communityComments',
  CommunityPost: 'communityPosts',
  CommunityRule: 'communityRules',
  ContentReport: 'contentReports',
  Course: 'courses',
  CourseEnrollment: 'courseEnrollments',
  EmailDelivery: 'emailDeliveries',
  EmailTemplate: 'emailTemplates',
  FAQ: 'faqs',
  HandLog: 'handLogs',
  League: 'leagues',
  LeagueMember: 'leagueMembers',
  LeaguePost: 'leaguePosts',
  LeaguePrize: 'leaguePrizes',
  LeagueRoundTimer: 'leagueRoundTimers',
  LeagueRSVP: 'leagueRsvps',
  LeagueScoreCard: 'leagueScoreCards',
  LeagueSession: 'leagueSessions',
  LeagueTableAssignment: 'leagueTableAssignments',
  Lesson: 'lessons',
  LessonFlighting: 'lessonFlightings',
  Manager: 'managers',
  MarketingFeature: 'marketingFeatures',
  MarketingPage: 'marketingPages',
  MarketingSection: 'marketingSections',
  MatchResult: 'matchResults',
  Organization: 'organizations',
  Player: 'players',
  PrizeStructure: 'prizeStructures',
  PrizeWinner: 'prizeWinners',
  Raffle: 'raffles',
  RaffleAllocation: 'raffleAllocations',
  RafflePrizeItem: 'rafflePrizeItems',
  RaffleTicket: 'raffleTickets',
  Registration: 'registrations',
  RoomMap: 'roomMaps',
  RoundTimer: 'roundTimers',
  ScoreCard: 'scoreCards',
  ShareInvite: 'shareInvites',
  SilentAuction: 'silentAuctions',
  SilentAuctionBid: 'silentAuctionBids',
  SilentAuctionItem: 'silentAuctionItems',
  SpecialHand: 'specialHands',
  Subscription: 'subscriptions',
  TableAssignment: 'tableAssignments',
  TeachingMaterial: 'teachingMaterials',
  Testimonial: 'testimonials',
  Tournament: 'tournaments',
  User: 'users',
};

function clientAlias(exportName) {
  return `${exportName}Api`;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'migration_export' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function stillNeedsBase44(source) {
  return (
    /base44\.(functions|auth|integrations|users)\./.test(source) ||
    /base44\.entities\./.test(source)
  );
}

function ensureResourceImports(source, exportNames) {
  if (!exportNames.length) return source;

  const aliasSpecs = exportNames
    .slice()
    .sort()
    .map((name) => `${name} as ${clientAlias(name)}`);
  const importLine = `import { ${aliasSpecs.join(', ')} } from '@/services/resources';`;

  // Already has a resources import — merge missing aliases
  const existingImportRe =
    /import\s*\{([^}]+)\}\s*from\s*['"]@\/services\/resources['"];?\r?\n?/;
  const existing = source.match(existingImportRe);
  if (existing) {
    const current = existing[1];
    const have = new Set();
    for (const part of current.split(',')) {
      const m = part.trim().match(/^(\w+)(?:\s+as\s+(\w+))?$/);
      if (m) have.add(m[1]);
    }
    const missing = exportNames.filter((n) => !have.has(n));
    if (!missing.length) return source;
    const additions = missing
      .sort()
      .map((name) => `${name} as ${clientAlias(name)}`)
      .join(', ');
    return source.replace(existingImportRe, (full, inner) => {
      const trimmed = inner.trim().replace(/,\s*$/, '');
      return `import { ${trimmed}, ${additions} } from '@/services/resources';\n`;
    });
  }

  if (source.includes("from '@/api/base44Client'") || source.includes('from "@/api/base44Client"')) {
    if (stillNeedsBase44(source)) {
      return source.replace(
        /import\s*\{\s*base44\s*\}\s*from\s*['"]@\/api\/base44Client['"];?/,
        (m) => `${m}\n${importLine}`,
      );
    }
    return source.replace(
      /import\s*\{\s*base44\s*\}\s*from\s*['"]@\/api\/base44Client['"];?\r?\n?/,
      `${importLine}\n`,
    );
  }

  // Insert after first import block line
  return source.replace(/^(import .+\r?\n)/m, `$1${importLine}\n`);
}

function transform(source) {
  if (!source.includes('base44.entities.')) {
    return { source, changed: false, entities: [] };
  }

  const entities = new Set();
  for (const match of source.matchAll(/base44\.entities\.([A-Za-z0-9_]+)\./g)) {
    entities.add(match[1]);
  }

  let next = source;

  const replaceEntityCall = (entity, methodTail) => {
    const exportName = ENTITY_TO_EXPORT[entity];
    if (!exportName) {
      console.warn(`unknown entity: ${entity}`);
      return `base44.entities.${entity}.${methodTail}`;
    }
    return `${clientAlias(exportName)}.${methodTail}`;
  };

  // filter / get / create / update / delete / bulk*
  next = next.replace(
    /base44\.entities\.([A-Za-z0-9_]+)\.filter\(/g,
    (_, entity) => replaceEntityCall(entity, 'filter('),
  );
  next = next.replace(
    /base44\.entities\.([A-Za-z0-9_]+)\.get\(/g,
    (_, entity) => replaceEntityCall(entity, 'get('),
  );
  next = next.replace(
    /base44\.entities\.([A-Za-z0-9_]+)\.(create|update|delete|bulkCreate|bulkUpdate)\(/g,
    (_, entity, method) => {
      const mapped = method === 'delete' ? 'remove' : method;
      return replaceEntityCall(entity, `${mapped}(`);
    },
  );

  // list() / list(sort) / list(sort, limit) / list(sort, limit, skip)
  next = next.replace(
    /base44\.entities\.([A-Za-z0-9_]+)\.list\(\s*\)/g,
    (_, entity) => replaceEntityCall(entity, 'list()'),
  );
  next = next.replace(
    /base44\.entities\.([A-Za-z0-9_]+)\.list\(\s*([^,)]+)\s*\)/g,
    (_, entity, sort) => replaceEntityCall(entity, `list({}, { sort: ${sort} })`),
  );
  next = next.replace(
    /base44\.entities\.([A-Za-z0-9_]+)\.list\(\s*([^,)]+)\s*,\s*([^,)]+)\s*\)/g,
    (_, entity, sort, limit) =>
      replaceEntityCall(entity, `list({}, { sort: ${sort}, limit: ${limit} })`),
  );
  next = next.replace(
    /base44\.entities\.([A-Za-z0-9_]+)\.list\(\s*([^,)]+)\s*,\s*([^,)]+)\s*,\s*([^,)]+)\s*\)/g,
    (_, entity, sort, limit, skip) =>
      replaceEntityCall(entity, `list({}, { sort: ${sort}, limit: ${limit}, skip: ${skip} })`),
  );

  // Leave base44.entities.X.subscribe(...) as-is (no-op in shim until realtime lands).

  const usedExports = new Set();
  for (const [entity, exportName] of Object.entries(ENTITY_TO_EXPORT)) {
    if (entities.has(entity) && !next.includes(`base44.entities.${entity}.`)) {
      // entity fully migrated (except maybe subscribe)
      if (new RegExp(`\\b${clientAlias(exportName)}\\.`).test(next)) {
        usedExports.add(exportName);
      }
    } else if (new RegExp(`\\b${clientAlias(exportName)}\\.`).test(next)) {
      usedExports.add(exportName);
    }
  }
  // Also detect if only subscribe remains for an entity — still need no import for that entity
  for (const exportName of Object.values(ENTITY_TO_EXPORT)) {
    if (new RegExp(`\\b${clientAlias(exportName)}\\.(filter|list|get|create|update|remove|bulkCreate|bulkUpdate)\\b`).test(next)) {
      usedExports.add(exportName);
    }
  }

  next = ensureResourceImports(next, [...usedExports]);

  const changed = next !== source;
  return { source: next, changed, entities: [...entities] };
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--all');
  const all = process.argv.includes('--all');
  const files = all
    ? walk(SRC)
    : args.map((a) => path.resolve(ROOT, a));

  let changedCount = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error('missing', file);
      continue;
    }
    const before = fs.readFileSync(file, 'utf8');
    const { source, changed, entities } = transform(before);
    if (!changed) continue;
    fs.writeFileSync(file, source);
    changedCount += 1;
    console.log('updated', path.relative(ROOT, file), '→', entities.join(', '));
  }
  console.log(`done: ${changedCount} files`);
}

main();
