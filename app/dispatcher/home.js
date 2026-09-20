import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Button } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "expo-router";
import { auth, db } from "../../firebase/firebaseConfig";

export default function DispatcherHome() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
   
    const q = query(
      collection(db, "reports"),
      where("status", "==", "SUBMITTED"),
      where("assignedEngineerId", "==", null),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setErrorMsg("");
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.log("Dispatcher reports listener error:", err);
        setErrorMsg(err.message);
      }
    );

    return () => unsub();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, padding: 16 }}>
        {/* HEADER */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>
            Dispatcher – Submitted Reports
          </Text>
          <Button title="Logout" onPress={() => signOut(auth)} />
        </View>

        {/* ERROR */}
        {errorMsg ? (
          <View
            style={{
              alignSelf: "center",
              width: "100%",
              padding: 12,
              borderWidth: 1,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontWeight: "700", textAlign: "center" }}>
              Error loading reports
            </Text>
            <Text style={{ marginTop: 6, opacity: 0.8, textAlign: "center" }}>
              {errorMsg}
            </Text>
          </View>
        ) : null}

        {/* EMPTY STATE */}
        {!errorMsg && items.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>
              No submitted reports
            </Text>
            <Text style={{ marginTop: 6, opacity: 0.7, textAlign: "center" }}>
              Reports submitted by citizens will appear here for triage.
            </Text>
          </View>
        ) : null}

        {/* LIST */}
        <FlatList
          contentContainerStyle={{ paddingBottom: 20 }}
          data={items}
          keyExtractor={(x) => x.id}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/dispatcher/priorities",
                  params: { id: item.id },
                })
              }
              style={{
                borderWidth: 1,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 16 }}>
                {item.title || item.category || "(No title)"}
              </Text>

              <Text numberOfLines={2} style={{ opacity: 0.8, marginTop: 4 }}>
                {item.description}
              </Text>

              <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                Status: {item.status}{" "}
                {item.geo?.latitude ? " • 📍 Has location" : " • No location"}
              </Text>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
