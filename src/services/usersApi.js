import { post } from '@/services/http';

/**
 * User admin helpers.
 * POST /api/users/invite — may 501 until ported.
 */
export async function inviteUser(email, role) {
  return post('/api/users/invite', { email, role });
}

export default { inviteUser };
