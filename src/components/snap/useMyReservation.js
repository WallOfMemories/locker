import { useEffect, useState } from "react";

import { getMyPayments } from "../../services/paymentService";

// NEW: has THIS person already paid for this space without posting a Snap?
// (They reserved it earlier and can post whenever they want.)
// -> { paymentId: string | null }
export function useMyReservation(space, currentUser, enabled = true) {
  const [paymentId, setPaymentId] = useState(null);

  const spaceId = space?.id;
  const uid = currentUser?.uid;
  const isEmpty = space?.status !== "occupied";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!enabled || !uid || !spaceId || !isEmpty) {
        setPaymentId(null);
        return;
      }

      try {
        const data = await getMyPayments();

        const match = (data.items || []).find(
          (item) => item.state === "unused" && item.spaceId === spaceId
        );

        if (!cancelled) setPaymentId(match ? match.paymentId : null);
      } catch {
        if (!cancelled) setPaymentId(null);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled, uid, spaceId, isEmpty]);

  return { paymentId, setPaymentId };
}