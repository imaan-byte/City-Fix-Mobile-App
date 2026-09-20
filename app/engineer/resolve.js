import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  Image,
  Pressable,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";
import * as ImagePicker from "expo-image-picker";
import { uploadUriToCloudinary } from "../../firebase/uploadExternal";

async function openInGoogleMaps(lat, lng, label = "Report Location") {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(label)}`;
  const ok = await Linking.canOpenURL(url);
  if (!ok) return Alert.alert("Can't open maps", url);
  return Linking.openURL(url);
}

export default function EngineerResolve() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [note, setNote] = useState("");

  const [afterLocalUris, setAfterLocalUris] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "reports", String(id));

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setReport(null);
          setLoading(false);
          return;
        }

        const data = { id: snap.id, ...snap.data() };

        const uid = auth.currentUser?.uid;
        if (uid && data.assignedEngineerId && data.assignedEngineerId !== uid) {
          Alert.alert("Access denied", "This job is not assigned to you.");
          router.replace("/engineer/jobs");
          return;
        }

        setReport(data);
        setNote(String(data.resolutionNote || ""));
        setLoading(false);
      },
      (err) => {
        Alert.alert("Error", err?.message || String(err));
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  const beforeUrls = useMemo(() => {
    const urls = Array.isArray(report?.beforePhotoUrls) ? report.beforePhotoUrls : [];
    const legacy = Array.isArray(report?.photos) ? report.photos.map((p) => p?.url).filter(Boolean) : [];
    return urls.length ? urls : legacy;
  }, [report]);

  const afterUrls = useMemo(() => {
    return Array.isArray(report?.afterPhotoUrls) ? report.afterPhotoUrls : [];
  }, [report]);

  const pickAfterPhotos = async () => {
    try {
      if (afterLocalUris.length >= 5) return Alert.alert("Limit reached", "Max 5 after photos.");

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert("Permission needed", "Media permission is required.");

      const imageMediaType =
        ImagePicker.MediaType?.Images ?? ImagePicker.MediaTypeOptions.Images;

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: imageMediaType,
        allowsMultipleSelection: true,
        selectionLimit: 5 - afterLocalUris.length,
        quality: 0.8,
      });

      if (!res.canceled) {
        const uris = res.assets.map((a) => a.uri).filter(Boolean);
        setAfterLocalUris((prev) => [...prev, ...uris].slice(0, 5));
      }
    } catch (e) {
      Alert.alert("Picker error", e?.message || String(e));
    }
  };

  const uploadAfterPhotos = async () => {
    if (!report) return;
    if (afterLocalUris.length === 0) return Alert.alert("No photos", "Pick at least 1 after photo.");

    setSaving(true);
    try {
      const newUrls = [];
      for (const uri of afterLocalUris) {
        const url = await uploadUriToCloudinary(uri, "reports/after");
        newUrls.push(url);
      }

      await updateDoc(doc(db, "reports", report.id), {
        afterPhotoUrls: [...(report.afterPhotoUrls || []), ...newUrls],
        updatedAt: serverTimestamp(),
      });

      setAfterLocalUris([]);
      Alert.alert("Uploaded", "After photos uploaded.");
    } catch (e) {
      console.log("UPLOAD AFTER ERROR:", e);
      Alert.alert("Upload failed", e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const markResolved = async () => {
    if (!report) return;
    if (!note.trim()) return Alert.alert("Missing note", "Add a short resolution note.");

    const totalAfter =
      (Array.isArray(report?.afterPhotoUrls) ? report.afterPhotoUrls.length : 0) + afterLocalUris.length;

    if (totalAfter < 1) {
      return Alert.alert("Missing after photo", "Upload at least 1 after photo before marking resolved.");
    }

    setSaving(true);
    try {
      let newlyUploaded = [];
      if (afterLocalUris.length > 0) {
        for (const uri of afterLocalUris) {
          const url = await uploadUriToCloudinary(uri, "reports/after");
          newlyUploaded.push(url);
        }
      }

      const timeline = [
        ...(report?.statusTimeline || []),
        { status: "RESOLVED_PENDING_QA", at: Timestamp.now() },
      ];

      await updateDoc(doc(db, "reports", report.id), {
        resolutionNote: note.trim(),
        afterPhotoUrls: [...(report.afterPhotoUrls || []), ...newlyUploaded],
        status: "RESOLVED_PENDING_QA",
        statusTimeline: timeline,
        updatedAt: serverTimestamp(),
      });

      setAfterLocalUris([]);
      Alert.alert("Submitted", "Marked as resolved. Waiting for QA verification.");
      router.replace("/engineer/jobs");
    } catch (e) {
      console.log("RESOLVE ERROR:", e);
      Alert.alert("Resolve failed", e?.message || String(e));
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
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Report not found.</Text>
          <Button title="Back" onPress={() => router.replace("/engineer/jobs")} />
        </View>
      </SafeAreaView>
    );
  }

  const hasGeo = !!(report.geo?.latitude && report.geo?.longitude);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", textAlign: "center" }}>Resolve Job</Text>

        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontWeight: "800" }}>{String(report.title || report.category || "").toUpperCase()}</Text>
          <Text style={{ marginTop: 6, opacity: 0.8 }}>{report.description}</Text>
          <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Priority: {report.priority || "—"} • Status: {report.status}
          </Text>
        </View>

        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontWeight: "800" }}>Location</Text>
          {hasGeo ? (
            <>
              <Text style={{ marginTop: 6, opacity: 0.8 }}>
                Lat: {Number(report.geo.latitude).toFixed(6)} | Lng: {Number(report.geo.longitude).toFixed(6)}
              </Text>
              <View style={{ marginTop: 10 }}>
                <Button
                  title="Open in Google Maps"
                  onPress={() => openInGoogleMaps(report.geo.latitude, report.geo.longitude, report.title || "Report")}
                  disabled={saving}
                />
              </View>
            </>
          ) : (
            <Text style={{ marginTop: 6, opacity: 0.7 }}>No location provided.</Text>
          )}
        </View>

        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontWeight: "800" }}>Citizen Photos (Before)</Text>
          {beforeUrls.length === 0 ? (
            <Text style={{ marginTop: 6, opacity: 0.7 }}>No before photos available.</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              {beforeUrls.map((url) => (
                <Image key={url} source={{ uri: url }} style={{ width: 100, height: 100, borderRadius: 12, borderWidth: 1 }} />
              ))}
            </View>
          )}
        </View>

        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Text style={{ fontWeight: "800" }}>Repair Photos (After)</Text>

          {afterUrls.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              {afterUrls.map((url) => (
                <Image key={url} source={{ uri: url }} style={{ width: 100, height: 100, borderRadius: 12, borderWidth: 1 }} />
              ))}
            </View>
          ) : (
            <Text style={{ marginTop: 6, opacity: 0.7 }}>No uploaded after photos yet.</Text>
          )}

          <View style={{ marginTop: 12 }}>
            <Button title={`Pick after photos (${afterLocalUris.length}/5)`} onPress={pickAfterPhotos} disabled={saving} />
          </View>

          {afterLocalUris.length > 0 ? (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                {afterLocalUris.map((uri) => (
                  <Pressable
                    key={uri}
                    onLongPress={() => !saving && setAfterLocalUris((prev) => prev.filter((x) => x !== uri))}
                  >
                    <Image source={{ uri }} style={{ width: 100, height: 100, borderRadius: 12, borderWidth: 1 }} />
                  </Pressable>
                ))}
              </View>
              <Text style={{ marginTop: 6, opacity: 0.6 }}>Long-press to remove selected photo.</Text>

              <View style={{ marginTop: 12 }}>
                <Button title="Upload after photos" onPress={uploadAfterPhotos} disabled={saving} />
              </View>
            </>
          ) : null}
        </View>

        <Text style={{ fontWeight: "700", textAlign: "center" }}>Resolution note</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What did you do to fix it?"
          multiline
          editable={!saving}
          style={{ borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 110 }}
        />

        <Button title={saving ? "Saving..." : "Mark Resolved (Send to QA)"} onPress={markResolved} disabled={saving} />
        <Button title="Back to My Jobs" onPress={() => router.replace("/engineer/jobs")} disabled={saving} />
      </ScrollView>
    </SafeAreaView>
  );
}
