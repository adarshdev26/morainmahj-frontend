import React, { useEffect, useState } from 'react';
import { callAction } from '@/services/actions';

/**
 * Wraps player data views - prevents export/copy, screenshot-safe only
 * Logs all access to audit trail
 */
export default function PlayerDataGuard({ 
  children, 
  entityType = 'ScoreCard',
  entityId,
  resourceType = 'personal_data',
  allowScreenshot = true
}) {
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    if (entityId && !logged) {
      logAccess();
      setLogged(true);
    }
  }, [entityId, logged]);

  const logAccess = async () => {
    try {
      await callAction('logDataAccess', {
        action: 'view',
        entity_type: entityType,
        entity_id: entityId,
        resource_type: resourceType,
        status: 'success',
      });
    } catch (err) {
      console.error('Failed to log access:', err);
    }
  };

  // Prevent right-click to copy/save
  const handleContextMenu = (e) => {
    if (!allowScreenshot) {
      e.preventDefault();
    }
  };

  // Disable text selection on sensitive fields
  const styles = allowScreenshot ? {} : {
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    userSelect: 'none',
  };

  return (
    <div onContextMenu={handleContextMenu} style={styles}>
      {children}
    </div>
  );
}