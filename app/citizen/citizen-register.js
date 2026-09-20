import { useState } from "react";
import { TextInput, Alert } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";
import { useRouter } from "expo-router";

import AuthFrame from "../../components/AuthFrame";
import AppButton from "../../components/AppButton";

export default function CitizenRegister() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Missing email", "Please enter your email.");
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          email: cleanEmail,
          role: "citizen",
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      router.replace("/citizen/home");
    } catch (e) {
      Alert.alert("Register failed", e?.message || String(e));
    }
  };

  return (
    <AuthFrame title="CITIZEN REGISTER">
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderColor: "#111", padding: 12, borderRadius: 14 }}
      />

      <TextInput
        placeholder="Password (min 6 chars)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#111", padding: 12, borderRadius: 14 }}
      />

      <AppButton title="Create account" onPress={register} />

      <AppButton
        title="Back"
        variant="secondary"
        onPress={() => router.back()}
      />
    </AuthFrame>
  );
}
