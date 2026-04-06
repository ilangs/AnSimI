import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useAlertStore } from '@/stores/alertStore';

export function useFamily() {
  const { family } = useAuthStore();
  const { loadFamily, members, isLoading } = useFamilyStore();
  const { subscribeToFamily, alerts, unreadCount } = useAlertStore();

  useEffect(() => {
    if (!family?.id) return;

    loadFamily(family.id);
    const unsubscribe = subscribeToFamily(family.id);

    return unsubscribe;
  }, [family?.id]);

  return {
    family,
    members,
    alerts,
    unreadCount,
    isLoading,
  };
}
