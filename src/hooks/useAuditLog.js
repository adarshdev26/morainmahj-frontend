import { me as authMe } from '@/services/authApi';
import { auditLogs as auditLogsApi } from '@/services/resources';

/**
 * Hook to log audit events for sensitive data access
 */
export function useAuditLog() {
  const logAction = async (action, entityType, entityId, resourceType, status = 'success', reasonDenied = null) => {
    try {
      const user = await authMe();
      if (!user) return;

      const details = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };

      await auditLogsApi.create({
        user_id: user.id,
        user_email: user.email,
        action,
        entity_type: entityType,
        entity_id: entityId,
        resource_type: resourceType,
        status,
        reason_denied: reasonDenied,
        details,
      });
    } catch (err) {
      console.error('Failed to log audit event:', err);
    }
  };

  return { logAction };
}