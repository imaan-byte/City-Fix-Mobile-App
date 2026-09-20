import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";

const ROLE_HOME = {
  citizen: "/citizen/home",
  dispatcher: "/dispatcher/home",
  engineer: "/engineer/jobs",
  qa: "/qa/list",
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setRole("");
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const r = snap.exists() ? String(snap.data()?.role || "").toLowerCase() : "";
        setRole(r);
      } catch (e) {
        console.log("Role load error:", e);
        setRole("");
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (loading) return;

    const root = segments?.[0] || ""; 
    const isAuth = root === "auth";

    
    if (!user) {
      if (!isAuth) router.replace("/auth/role-selection");
      return;
    }

   
    if (!role) {
      if (!isAuth) router.replace("/auth/role-selection");
      return;
    }

    const home = ROLE_HOME[role] || "/auth/role-selection";

    if (isAuth) {
      router.replace(home);
      return;
    }

    if (root !== role) {
      router.replace(home);
      return;
    }
  }, [loading, user, role, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
