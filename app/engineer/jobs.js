import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, Button } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "expo-router";
import { auth, db } from "../../firebase/firebaseConfig";

export default function EngineerJobs() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;

    // ✅ show assigned work (you can include IN_PROGRESS too if you use it)
    const q = query(
      collection(db, "reports"),
      where("assignedEngineerId", "==", auth.currentUser.uid),
      where("status", "in", ["ASSIGNED", "IN_PROGRESS"]),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setErrorMsg("");
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.log("Engineer jobs listener error:", err);
        setErrorMsg(err?.message || "Failed to load jobs.");
      }
    );

    return () => unsub();
  }, []);

  const formatDeadline = (deadline) => {
    if (!deadline) return "No deadline";
    const date = deadline?.toDate ? deadline.toDate() : new Date(deadline);
    return date.toDateString();
  };

  const getBeforeCount = (item) => {
    if (Array.isArray(item.beforePhotoUrls)) return item.beforePhotoUrls.length;
    if (Array.isArray(item.photos)) return item.photos.length;
    return 0;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: "700" }}>Engineer – My Jobs</Text>
          <View style={{ marginTop: 10, width: "100%" }}>
            <Button title="Logout" onPress={() => signOut(auth)} />
          </View>
        </View>

        {errorMsg ? (
          <View style={{ padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 12 }}>
            <Text style={{ fontWeight: "700", textAlign: "center" }}>Error</Text>
            <Text style={{ textAlign: "center", opacity: 0.8, marginTop: 6 }}>{errorMsg}</Text>
          </View>
        ) : null}

        {!errorMsg && items.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>No assigned jobs</Text>
            <Text style={{ marginTop: 6, opacity: 0.7, textAlign: "center" }}>
              When the dispatcher assigns you work, it will appear here.
            </Text>
          </View>
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/engineer/resolve", params: { id: item.id } })}
              style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}
            >
              <Text style={{ fontWeight: "800" }}>
                {String(item.title || item.category || "").toUpperCase()}
              </Text>

              <Text style={{ marginTop: 6, opacity: 0.8 }} numberOfLines={2}>
                {item.description}
              </Text>

              <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                Priority: {item.priority || "—"} • Due: {formatDeadline(item.deadline)}
              </Text>

              <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                {item.geo?.latitude ? "📍 Location available" : "⚠️ No location"} •{" "}
                {getBeforeCount(item)} photo(s)
              </Text>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
