import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Button, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "expo-router";
import { auth, db } from "../../firebase/firebaseConfig";

export default function QaList() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "reports"),
      where("status", "==", "RESOLVED_PENDING_QA"),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setErrorMsg("");
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.log("QA queue listener error:", err);
        setErrorMsg(err?.message || "Failed to load QA queue. You may need a Firestore index.");
        setLoading(false);
      }
    );

    return unsub;
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "900" }}>QA Queue</Text>
          <Button title="Logout" onPress={() => signOut(auth)} />
        </View>

        {/* Loading */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 10, opacity: 0.7 }}>Loading queue…</Text>
          </View>
        ) : null}

        {/* Error */}
        {!loading && errorMsg ? (
          <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderRadius: 12 }}>
            <Text style={{ fontWeight: "900" }}>Error loading queue</Text>
            <Text style={{ marginTop: 6, opacity: 0.8 }}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Empty */}
        {!loading && !errorMsg && items.length === 0 ? (
          <View style={{ marginTop: 28, alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "800" }}>No jobs to verify</Text>
            <Text style={{ marginTop: 6, opacity: 0.7, textAlign: "center" }}>
              When engineers mark jobs as resolved, they appear here.
            </Text>
          </View>
        ) : null}

        {/* List */}
        {!loading ? (
          <FlatList
            style={{ marginTop: 12 }}
            data={items}
            keyExtractor={(x) => x.id}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push({ pathname: "/qa/review", params: { id: item.id } })}
                style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}
              >
                <Text style={{ fontWeight: "900" }}>
                  {String(item.title || item.category || "Report").toUpperCase()}
                </Text>

                <Text numberOfLines={2} style={{ opacity: 0.8, marginTop: 6 }}>
                  {item.description || "No description"}
                </Text>

                <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                  Status: {item.status || "—"} • Priority: {item.priority || "—"}
                </Text>
              </Pressable>
            )}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
