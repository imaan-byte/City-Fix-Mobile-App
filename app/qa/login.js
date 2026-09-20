import { useState } from "react";
import { TextInput, Alert } from "react-native";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";
import { useRouter } from "expo-router";

import AuthFrame from "../../components/AuthFrame";
import AppButton from "../../components/AppButton";

export default function QALogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      const snap = await getDoc(doc(db, "users", cred.user.uid));

      if (!snap.exists()) {
        await signOut(auth);
        Alert.alert(
          "Account not set up",
          "No role found for this account. Please contact admin / set role in Firestore."
        );
        router.replace("/auth/role-selection");
        return;
      }

      const role = String(snap.data()?.role || "").trim().toLowerCase();

      // ✅ Firestore role = "qa"
      if (role !== "qa") {
        await signOut(auth);
        Alert.alert("Access denied", "This account is not a QA account.");
        router.replace("/auth/role-selection");
        return;
      }

      router.replace("/qa/list");
    } catch (e) {
      Alert.alert("Login failed", e?.message || String(e));
    }
  };

  return (
    <AuthFrame title="QA LOGIN">
      <TextInput
        placeholder="QA email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: "#111", padding: 12, borderRadius: 14 }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#111", padding: 12, borderRadius: 14 }}
      />

      <AppButton title="Login" onPress={login} />

      <AppButton
        title="Back"
        variant="secondary"
        onPress={() => router.back()}
      />
    </AuthFrame>
  );
}
