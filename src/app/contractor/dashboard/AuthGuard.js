"use client";

import useFirebaseReady from "@/hooks/useFirebaseReady";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setUserData } from "@/redux/reducers/user";
import { getProtected } from "@/requests/get";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const firebaseReady = useFirebaseReady();
  const user = useAppSelector((state) => state.user.user);

  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!firebaseReady) return; // wait until Firebase has initialized session

    async function verifyVendorSession() {
      try {
        const res = await getProtected("auth/current-auth-state", "Vendor");

        console.log({res});

        if (res.status === "OK") {
          // Only allow Vendors here
          if (res.data?.role !== "Vendor") {
            return router.replace("/login");
          }

          dispatch(setUserData({ user: res.data }));
          setAuthReady(true);
        } else {
          router.replace("/login");
        }
      } catch (err) {
        router.replace("/login");
      }
    }

    verifyVendorSession();
  }, [firebaseReady]);

  if (!firebaseReady || !authReady) {
    return (
      <div style={{ padding: 40, fontSize: 16 }}>
        Loading your dashboard…
      </div>
    );
  }

  return <>{children}</>;
}
