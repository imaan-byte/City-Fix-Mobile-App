import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig";
import { useRouter } from "expo-router";
import AppButton from "../../components/AppButton";

export default function CitizenHome() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, padding: 20, gap: 14 }}>
        <Text style={{ fontSize: 28, fontWeight: "900", marginTop: 10 }}>Citizen Dashboard</Text>
        <Text style={{ opacity: 0.7, lineHeight: 20 }}>
          Report issues like potholes, streetlights, missed bins, or flooding.
        </Text>

        <View style={{ height: 14 }} />

        <AppButton title="Report an issue" onPress={() => router.push("/citizen/report-create")} />
        <AppButton title="My reports" onPress={() => router.push("/citizen/reports")} variant="secondary" />
        <AppButton title="Map view" onPress={() => router.push("/citizen/map")} variant="secondary" />

        <View style={{ flex: 1 }} />

        <AppButton
          title="Logout"
          variant="secondary"
          onPress={async () => {
            await signOut(auth);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
