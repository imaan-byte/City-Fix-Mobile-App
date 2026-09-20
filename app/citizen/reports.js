import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";
import { useRouter } from "expo-router";
import AppButton from "../../components/AppButton"; 

export default function CitizenReports() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "reports"),
      where("citizenId", "==", uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setReports(items);
        setLoading(false);
      },
      (err) => {
        console.log("Reports listener error:", err);
        setLoading(false);
        Alert.alert("Could not load reports", err.message);
      }
    );

    return () => unsub();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ padding: 20, gap: 12, flex: 1 }}>
        <Text style={{ fontSize: 28, fontWeight: "900" }}>My Reports</Text>

        <AppButton title="Back" variant="secondary" onPress={() => router.back()} />

        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 10 }}>Loading...</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ opacity: 0.7, textAlign: "center" }}>
              No reports yet. Create one from Home.
            </Text>
          </View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/citizen/edit",
                    params: { reportId: item.id },
                  })
                }
                style={{
                  borderWidth: 1,
                  borderColor: "#111",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <Text style={{ fontWeight: "900", fontSize: 16 }}>
                  {item.title || "(No title)"}
                </Text>
                <Text style={{ marginTop: 4, opacity: 0.75 }}>
                  {item.category} • {item.mode || "SUBMITTED"}
                </Text>
                <Text style={{ marginTop: 6 }} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={{ marginTop: 8, fontWeight: "800" }}>
                  Status: {item.status || "Submitted"}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
