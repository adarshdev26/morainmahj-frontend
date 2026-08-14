import { useAuth } from '@/lib/AuthContext';
import { registrations as registrationsApi, tournaments as tournamentsApi } from '@/services/resources';

/**
 * Returns the current user's organization_id and a helper to build
 * org-scoped query filters for entity SDK calls.
 *
 * Usage:
 *   const { organizationId, orgFilter } = useOrganization();
 *   const tournaments = await tournamentsApi.filter(orgFilter());
 *   const myRegs = await registrationsApi.filter({ ...orgFilter(), player_id: user.id });
 *
 * Super Admins (role === 'admin') have no organization_id filter applied —
 * they see all data across all orgs. Pass { scoped: true } to force-scope
 * even admin queries (rarely needed).
 */
export function useOrganization() {
  const { user, organizationId } = useAuth();

  const isSuperAdmin = user?.role === 'admin';
  const isOrganizerAdmin = user?.role === 'organizer_admin';

  /**
   * Builds a filter object scoped to the current organization.
   * Returns {} for super admins (no filter = see everything).
   */
  const orgFilter = (opts = {}) => {
    const forceScoped = opts.scoped === true;
    if (isSuperAdmin && !forceScoped) return {};
    if (!organizationId) return {};
    return { organization_id: organizationId };
  };

  /**
   * Returns true if a record belongs to the current org (or user is super admin).
   */
  const belongsToOrg = (record) => {
    if (isSuperAdmin) return true;
    if (!organizationId) return false;
    return record?.organization_id === organizationId;
  };

  return {
    organizationId,
    isSuperAdmin,
    isOrganizerAdmin,
    orgFilter,
    belongsToOrg,
  };
}