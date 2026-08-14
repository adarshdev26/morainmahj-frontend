import { useEffect, useState } from 'react';
import { me as authMe } from '@/services/authApi';

/**
 * Hook to check if current user can export data
 * Only admins can export - all other users are denied
 */
export function useExportPermission() {
  const [canExport, setCanExport] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const user = await authMe();
        if (!user) {
          setCanExport(false);
          setIsDenied(true);
          setIsLoading(false);
          return;
        }

        // Only admins can export
        if (user.role === 'admin') {
          setCanExport(true);
          setIsDenied(false);
        } else {
          setCanExport(false);
          setIsDenied(true);
        }
      } catch (err) {
        setCanExport(false);
        setIsDenied(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, []);

  return { canExport, isDenied, isLoading };
}