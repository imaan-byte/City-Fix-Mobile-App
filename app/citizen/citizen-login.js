import { useState } from "react";
import { TextInput, Alert } from "react-native";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";
import { useRouter } from "expo-router";

import AuthFrame from "../../components/AuthFrame";
import AppButton from "../../components/AppButton";

export default function CitizenLogin() {
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
          "No role found for this account. Please choose a role again."
        );
        router.replace("/auth/role-selection");
        return;
      }

      const role = String(snap.data()?.role || "").trim().toLowerCase();

      if (role !== "citizen") {
        await signOut(auth);
        Alert.alert("Access denied", "This account is not a citizen account.");
        router.replace("/auth/role-selection");
        return;
      }

      router.replace("/citizen/home");
    } catch (e) {
      Alert.alert("Login failed", e?.message || String(e));
    }
  };

  return (
    <AuthFrame title="CITIZEN LOGIN">
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        style={{ borderWidth: 1, borderColor: "#111", padding: 12, borderRadius: 14 }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={{ borderWidth: 1, borderColor: "#111", padding: 12, borderRadius: 14 }}
      />

      <AppButton title="Login" onPress={login} />

      <AppButton
        title="New citizen? Register"
        variant="secondary"
        onPress={() => router.push("/citizen/citizen-register")}
      />

      <AppButton title="Back" variant="secondary" onPress={() => router.back()} />
    </AuthFrame>
  );
}
