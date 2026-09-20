import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  Pressable,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { Picker } from "@react-native-picker/picker";
import { auth, db } from "../../firebase/firebaseConfig";

// ✅ Google Maps fallback (works on iOS/Android/simulator)
async function openInMaps(lat, lng, label = "Report Location") {
  try {
    const q = encodeURIComponent(label);
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    // optional: try native geo: first on Android
    if (Platform.OS === "android") {
      const geoUrl = `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
      const canGeo = await Linking.canOpenURL(geoUrl);
      if (canGeo) {
        await Linking.openURL(geoUrl);
        return;
      }
    }

    await Linking.openURL(googleUrl);
  } catch (e) {
    Alert.alert("Maps error", e?.message || "Could not open map location.");
  }
}

export default function Priorities() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [report, setReport] = useState(null);

  const [priority, setPriority] = useState("medium");
  const [deadlineText, setDeadlineText] = useState("");
  const [engineerId, setEngineerId] = useState("");

  const [engineers, setEngineers] = useState([]);
  const [loadingEngineers, setLoadingEngineers] = useState(true);

  // ✅ Live report listener (so photos/location updates instantly)
  useEffect(() => {
    if (!id) return;

    const ref = doc(db, "reports", String(id));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          Alert.alert("Not found", "Report not found.");
          router.replace("/dispatcher/home");
          return;
        }

        const data = { id: snap.id, ...snap.data() };
        setReport(data);

        if (data.priority) setPriority(String(data.priority));
      },
      (err) => Alert.alert("Error", err.message)
    );

    return () => unsub();
  }, [id]);

  // ✅ Load engineers
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "engineer"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));

        setEngineers(list);
        setLoadingEngineers(false);

        if (!engineerId && list.length > 0) setEngineerId(list[0].id);
      },
      (err) => {
        console.log("Engineer load error:", err);
        setEngineers([]);
        setLoadingEngineers(false);
      }
    );

    return () => unsub();
  }, []);

  // ✅ Resolve photos (beforePhotoUrls preferred, legacy photos fallback)
  const photoUrls = useMemo(() => {
    const urls = Array.isArray(report?.beforePhotoUrls) ? report.beforePhotoUrls : [];
    const legacy = Array.isArray(report?.photos)
      ? report.photos.map((p) => p?.url).filter(Boolean)
      : [];
    return urls.length ? urls : legacy;
  }, [report]);

  const hasGeo = !!(report?.geo?.latitude && report?.geo?.longitude);

  const assign = async () => {
    if (!id) return;
    if (!engineerId) return Alert.alert("Missing engineer", "Please select an engineer.");
    if (!deadlineText.trim()) return Alert.alert("Missing deadline", "Enter deadline like 2026-01-30.");

    const deadlineDate = new Date(deadlineText.trim() + "T23:59:00");
    if (isNaN(deadlineDate.getTime())) return Alert.alert("Invalid date", "Use format YYYY-MM-DD.");

    try {
      const timeline = [
        ...(report?.statusTimeline || []),
        { status: "ASSIGNED", at: Timestamp.now() },
      ];

      await updateDoc(doc(db, "reports", String(id)), {
        priority,
        deadline: Timestamp.fromDate(deadlineDate),
        assignedEngineerId: engineerId,
        assignedByDispatcherId: auth.currentUser?.uid || null,
        status: "ASSIGNED",
        statusTimeline: timeline,
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Assigned", "Report assigned to engineer.");
      router.replace("/dispatcher/home");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  if (!report) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, fontWeight: "600" }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        {/* HEADER */}
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 10 }}>
            Triage & Assign
          </Text>
          <View style={{ width: "100%" }}>
            <Button title="Back to Reports" onPress={() => router.replace("/dispatcher/home")} />
          </View>
        </View>

        {/* REPORT CARD */}
        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "800" }}>
            {String(report.title || report.category || "").toUpperCase()}
          </Text>

          <Text style={{ marginTop: 6, opacity: 0.8 }}>{report.description}</Text>

          <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Category: {report.category || "—"} • Status: {report.status || "—"}
          </Text>

          {/* LOCATION */}
          <Text style={{ marginTop: 12, fontWeight: "700" }}>Location</Text>
          {hasGeo ? (
            <>
              <Text style={{ marginTop: 6, opacity: 0.8 }}>
                Lat: {Number(report.geo.latitude).toFixed(6)} | Lng: {Number(report.geo.longitude).toFixed(6)}
              </Text>

              <View style={{ marginTop: 10 }}>
                <Button
                  title="Open in Google Maps"
                  onPress={() =>
                    openInMaps(
                      report.geo.latitude,
                      report.geo.longitude,
                      report.title || report.category || "Report"
                    )
                  }
                />
              </View>
            </>
          ) : (
            <Text style={{ marginTop: 6, opacity: 0.7 }}>No location provided.</Text>
          )}

          {/* PHOTOS */}
          <Text style={{ marginTop: 14, fontWeight: "700" }}>Citizen Photos</Text>
          {photoUrls.length === 0 ? (
            <Text style={{ marginTop: 6, opacity: 0.7 }}>
              No photos found. (Citizen must upload to Storage and save beforePhotoUrls.)
            </Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              {photoUrls.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#111",
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* PRIORITY */}
        <Text style={{ textAlign: "center", fontWeight: "700", marginBottom: 8 }}>
          Priority
        </Text>
        <View style={{ gap: 8, marginBottom: 18 }}>
          {["low", "medium", "high"].map((p) => (
            <Pressable
              key={p}
              onPress={() => setPriority(p)}
              style={{
                borderWidth: 1,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                backgroundColor: priority === p ? "#f2f2f2" : "#fff",
              }}
            >
              <Text style={{ fontWeight: "600" }}>{p.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {/* DEADLINE */}
        <Text style={{ textAlign: "center", fontWeight: "700", marginBottom: 8 }}>
          Deadline (YYYY-MM-DD)
        </Text>
        <TextInput
          value={deadlineText}
          onChangeText={setDeadlineText}
          placeholder="2026-01-30"
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            padding: 12,
            borderRadius: 12,
            marginBottom: 18,
          }}
        />

        {/* ENGINEER DROPDOWN */}
        <Text style={{ textAlign: "center", fontWeight: "700", marginBottom: 8 }}>
          Assign Engineer
        </Text>

        <View style={{ borderWidth: 1, borderRadius: 12, overflow: "hidden", marginBottom: 18 }}>
          {loadingEngineers ? (
            <View style={{ padding: 14, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8, opacity: 0.7 }}>Loading engineers…</Text>
            </View>
          ) : engineers.length === 0 ? (
            <View style={{ padding: 14 }}>
              <Text style={{ textAlign: "center", fontWeight: "700" }}>
                No engineers found
              </Text>
            </View>
          ) : (
            <Picker selectedValue={engineerId} onValueChange={(v) => setEngineerId(v)}>
              {engineers.map((e) => (
                <Picker.Item
                  key={e.id}
                  label={e.email || `Engineer ${e.id.slice(0, 6)}…`}
                  value={e.id}
                />
              ))}
            </Picker>
          )}
        </View>

        {/* ASSIGN */}
        <Button title="Assign" onPress={assign} />
      </ScrollView>
    </SafeAreaView>
  );
}
