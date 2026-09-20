import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
  Pressable,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";


async function openInMaps(lat, lng, label = "Report Location") {
  try {
    const q = encodeURIComponent(label);
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    if (Platform.OS === "android") {
      const geoUrl = `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
      const canGeo = await Linking.canOpenURL(geoUrl);
      if (canGeo) return await Linking.openURL(geoUrl);
    }

    await Linking.openURL(googleUrl);
  } catch (e) {
    Alert.alert("Maps error", e?.message || "Could not open map location.");
  }
}

function PhotoGrid({ urls }) {
  if (!urls || urls.length === 0) {
    return <Text style={{ marginTop: 8, opacity: 0.7 }}>No photos.</Text>;
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
      {urls.map((url) => (
        <Pressable
          key={url}
          onPress={() => Linking.openURL(url)}
          style={{ borderWidth: 1, borderRadius: 12, overflow: "hidden" }}
        >
          <Image source={{ uri: url }} style={{ width: 110, height: 110 }} />
        </Pressable>
      ))}
    </View>
  );
}

export default function QaReview() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "reports", String(id)));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setReport(data);
          setReason(String(data.qaReopenReason || ""));
        }
      } catch (e) {
        Alert.alert("Error", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  
  const beforeUrls = useMemo(() => {
    const urls = Array.isArray(report?.beforePhotoUrls) ? report.beforePhotoUrls : [];
    const legacy = Array.isArray(report?.photos)
      ? report.photos.map((p) => p?.url).filter(Boolean)
      : [];
    return urls.length ? urls : legacy;
  }, [report]);

  
  const afterUrls = useMemo(() => {
    return Array.isArray(report?.afterPhotoUrls) ? report.afterPhotoUrls : [];
  }, [report]);

  const hasGeo = !!(report?.geo?.latitude && report?.geo?.longitude);

  const verify = async () => {
    try {
      setSaving(true);

      const timeline = [
        ...(report?.statusTimeline || []),
        { status: "VERIFIED_CLOSED", at: Timestamp.now() },
      ];

      await updateDoc(doc(db, "reports", String(id)), {
        status: "VERIFIED_CLOSED",
        qaVerifiedAt: serverTimestamp(),
        statusTimeline: timeline,
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Verified", "Job is now closed.");
      router.replace("/qa/list");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const reopen = async () => {
    if (!reason.trim()) {
      Alert.alert("Missing reason", "Please enter why you are reopening the job.");
      return;
    }

    try {
      setSaving(true);

      const timeline = [
        ...(report?.statusTimeline || []),
        { status: "REOPENED", at: Timestamp.now() },
      ];

      await updateDoc(doc(db, "reports", String(id)), {
        status: "REOPENED",
        qaReopenReason: reason.trim(),
        qaReopenedAt: serverTimestamp(),
        statusTimeline: timeline,
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Reopened", "Job sent back for rework.");
      router.replace("/qa/list");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, fontWeight: "600" }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
          <Text style={{ fontWeight: "800" }}>Report not found.</Text>
          <View style={{ marginTop: 12 }}>
            <Button title="Back to Queue" onPress={() => router.replace("/qa/list")} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", textAlign: "center" }}>QA Review</Text>

        {/* Report card */}
        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontWeight: "900" }}>
            {String(report.title || report.category || "REPORT").toUpperCase()}
          </Text>
          <Text style={{ marginTop: 6, opacity: 0.85 }}>{report.description || "No description"}</Text>
          <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Status: {report.status || "—"} • Priority: {report.priority || "—"}
          </Text>
        </View>

        {/* Location */}
        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontWeight: "900" }}>Location</Text>
          {hasGeo ? (
            <>
              <Text style={{ marginTop: 6, opacity: 0.8 }}>
                Lat: {Number(report.geo.latitude).toFixed(6)} | Lng: {Number(report.geo.longitude).toFixed(6)}
              </Text>
              <View style={{ marginTop: 10 }}>
                <Button
                  title="Open in Google Maps"
                  onPress={() =>
                    openInMaps(report.geo.latitude, report.geo.longitude, report.title || report.category || "Report")
                  }
                />
              </View>
            </>
          ) : (
            <Text style={{ marginTop: 6, opacity: 0.7 }}>No location provided.</Text>
          )}
        </View>

        {/* Engineer note */}
        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontWeight: "900" }}>Engineer resolution note</Text>
          <Text style={{ marginTop: 6, opacity: 0.85 }}>
            {report.resolutionNote ? String(report.resolutionNote) : "—"}
          </Text>
        </View>

        {/* Before photos */}
        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontWeight: "900" }}>Before Photos</Text>
          <PhotoGrid urls={beforeUrls} />
          <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
            Tap an image to open it.
          </Text>
        </View>

        {/* After photos */}
        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontWeight: "900" }}>After Photos</Text>
          <PhotoGrid urls={afterUrls} />
          <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
            Tap an image to open it.
          </Text>
        </View>

        {/* Reopen reason */}
        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontWeight: "900" }}>Reopen reason (only if rejecting)</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Why is this not acceptable?"
            multiline
            style={{ borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 90, marginTop: 10 }}
          />
        </View>

        <View style={{ gap: 10 }}>
          <Button title={saving ? "Saving..." : "Verify & Close"} onPress={verify} disabled={saving} />
          <Button title={saving ? "Saving..." : "Reopen Job (Send back)"} onPress={reopen} disabled={saving} />
          <Button title="Back to Queue" onPress={() => router.replace("/qa/list")} disabled={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
