import { useEffect } from "react";
import { View, ActivityIndicator, Text, Image } from "react-native";
import { useRouter } from "expo-router";

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/auth/role-selection");
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        backgroundColor: "#fff"
      }}
    >
      {/* Logo */}
      <Image
        source={require("../../assets/images/icon.png")}
        style={{
          width: 160,
          height: 160
        }}
        resizeMode="contain"
      />

      {/* App name */}
      <Text style={{ fontSize: 26, fontWeight: "800", marginTop: 4 }}>
        CITY FIX
      </Text>

      {/* Loader */}
      <ActivityIndicator size="small" />
      <Text style={{ opacity: 0.7 }}>Loading…</Text>
    </View>
  );
}
