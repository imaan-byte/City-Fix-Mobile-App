
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

const ROLE_HOME = {
  citizen: "/citizen/home",
  dispatcher: "/dispatcher/home",
  engineer: "/engineer/jobs",
  qa: "/qa/list",
};


function isPublicRoute(segments) {
  const root = segments?.[0] || "";
  const screen = segments?.[1] || "";

  if (root === "auth") return true;

  if (root === "citizen" && (screen === "citizen-login" || screen === "citizen-register")) return true;
  if (root === "dispatcher" && screen === "login") return true;
  if (root === "engineer" && screen === "login") return true;
  if (root === "qa" && screen === "login") return true;

  return false;
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [user, setUser] = useState(null);

  const [role, setRole] = useState("");
  const [roleStatus, setRoleStatus] = useState("loading"); 
  const [booting, setBooting] = useState(true);

  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

    
      if (!u) {
        setRole("");
        setRoleStatus("missing");
        setBooting(false);
        return;
      }

      
      setRoleStatus("loading");
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (!snap.exists()) {
          setRole("");
          setRoleStatus("missing");
        } else {
          const r = String(snap.data()?.role || "").trim().toLowerCase();
          if (!r) {
            setRole("");
            setRoleStatus("missing");
          } else {
            setRole(r);
            setRoleStatus("ok");
          }
        }
      } catch (e) {
        console.log("Role load error:", e?.code, e?.message, e);

        setRole("");
        setRoleStatus("error");
      } finally {
        setBooting(false);
      }
    });

    return unsub;
  }, []);

  
  useEffect(() => {
    if (booting) return;

    const root = segments?.[0] || "";
    const screen = segments?.[1] || "";
    const isAuthRoot = root === "auth";

    
    if (!user) {
      if (!isPublicRoute(segments)) {
        router.replace("/auth/role-selection");
      }
      return;
    }

    
    if (roleStatus === "error") {
      return;
    }

    
    if (roleStatus === "missing") {
      if (!(isAuthRoot && screen === "role-selection")) {
        router.replace("/auth/role-selection");
      }
      return;
    }

   
    const home = ROLE_HOME[role] || "/auth/role-selection";

    
    if (isAuthRoot && screen !== "role-selection") {
      router.replace(home);
      return;
    }

   
    if (!isAuthRoot && root !== role) {
      router.replace(home);
      return;
    }
  }, [booting, user, role, roleStatus, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
