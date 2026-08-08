"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/loading-screen";
import { homeForRole } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

export default function StartPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) router.replace(homeForRole(user.papel));
  }, [router, user]);

  return <LoadingScreen />;
}
