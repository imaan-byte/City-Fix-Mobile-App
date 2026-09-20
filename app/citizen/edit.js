import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import AppButton from "../../components/AppButton";
import { uploadUriToCloudinary } from "../../firebase/uploadExternal";
import { auth, db } from "../../firebase/firebaseConfig";

import {
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

const CATEGORIES = ["pothole", "streetlight", "waste", "missed bin", "flooding"];

export default function ReportDetail() {
  const { reportId } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [report, setReport] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("pothole");

  const [draftUris, setDraftUris] = useState([]);

  useEffect(() => {
    if (!reportId) return;

    const ref = doc(db, "reports", String(reportId));

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          Alert.alert("Not found", "This report does not exist.");
          router.replace("/citizen/reports");
          return;
        }

        const data = { id: snap.id, ...snap.data() };

        
        const uid = auth.currentUser?.uid;
        if (uid && data.citizenId && data.citizenId !== uid) {
          Alert.alert("Access denied", "You can only view your own reports.");
          router.replace("/citizen/reports");
          return;
        }

        setReport(data);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setCategory(data.category || "pothole");

        
        setDraftUris(Array.isArray(data.draftPhotoUris) ? data.draftPhotoUris : []);

        setLoading(false);
      },
      (err) => {
        console.log("Report detail listener error:", err);
        setLoading(false);
        Alert.alert("Error loading report", err?.message || String(err));
      }
    );

    return () => unsub();
  }, [reportId]);

  const isLocked = useMemo(() => {
    if (!report) return true;
    return report.locked === true || report.mode === "SUBMITTED";
  }, [report]);

  const pickPhotos = async () => {
    if (isLocked) return;
    try {
      if (draftUris.length >= 5) {
        Alert.alert("Limit reached", "Max 5 photos allowed.");
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Media permission is required.");
        return;
      }

      const imageMediaType =
        ImagePicker.MediaType?.Images ?? ImagePicker.MediaTypeOptions.Images;

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: imageMediaType,
        allowsMultipleSelection: true,
        selectionLimit: 5 - draftUris.length,
        quality: 0.8,
      });

      if (!res.canceled) {
        const uris = (res.assets || []).map((a) => a.uri).filter(Boolean);
        setDraftUris((prev) => [...prev, ...uris].slice(0, 5));
      }
    } catch (e) {
      Alert.alert("Picker error", e?.message || String(e));
    }
  };

  const removeDraftUri = (uri) => {
    if (isLocked) return;
    setDraftUris((prev) => prev.filter((x) => x !== uri));
  };

  const saveDraftChanges = async () => {
    if (!report || isLocked) return;

    if (!title.trim() && !description.trim()) {
      return Alert.alert("Nothing to save", "Add at least a title or description.");
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, "reports", report.id), {
        title: title.trim(),
        description: description.trim(),
        category,

        
        draftPhotoUris: draftUris,

        updatedAt: serverTimestamp(),
      });

      Alert.alert("Saved", "Draft updated (including photos).");
    } catch (e) {
      Alert.alert("Error", e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async () => {
    if (!report || isLocked) return;

    Alert.alert("Delete draft?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            await deleteDoc(doc(db, "reports", report.id));
            router.replace("/citizen/reports");
          } catch (e) {
            Alert.alert("Error", e?.message || String(e));
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const submitDraft = async () => {
    if (!report || isLocked) return;

    if (!title.trim()) return Alert.alert("Missing title", "Please add a title.");
    if (!description.trim())
      return Alert.alert("Missing description", "Please add a description.");
    if (!report.geo?.latitude || !report.geo?.longitude) {
      return Alert.alert("Missing location", "Please set GPS location in the draft.");
    }

    const hasBeforeUrls =
      Array.isArray(report.beforePhotoUrls) && report.beforePhotoUrls.length > 0;

    const hasDraftUris = Array.isArray(draftUris) && draftUris.length > 0;

    if (!hasBeforeUrls && !hasDraftUris) {
      return Alert.alert("Missing photos", "Please add at least 1 photo.");
    }

    try {
      setSaving(true);

      
      let newlyUploadedBeforeUrls = [];

      if (!hasBeforeUrls && hasDraftUris) {
        for (const uri of draftUris) {
          const url = await uploadUriToCloudinary(uri, "reports/before");
          newlyUploadedBeforeUrls.push(url);
        }
      }

      const newTimeline = [
        ...(report.statusTimeline || []),
        { status: "SUBMITTED", at: Timestamp.now() },
      ];

      const mergedBeforeUrls = [
        ...(Array.isArray(report.beforePhotoUrls) ? report.beforePhotoUrls : []),
        ...newlyUploadedBeforeUrls,
      ];

      await updateDoc(doc(db, "reports", report.id), {
        title: title.trim(),
        description: description.trim(),
        category,

        beforePhotoUrls: mergedBeforeUrls,

        
        draftPhotoUris: [],

        mode: "SUBMITTED",
        locked: true,
        status: "SUBMITTED",

        statusTimeline: newTimeline,
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Submitted", "Your report is now locked (read-only).");
      router.replace("/citizen/reports");
    } catch (e) {
      console.log("SUBMIT DRAFT ERROR:", e);
      Alert.alert("Error", e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const photoCount = useMemo(() => {
    const uploaded = Array.isArray(report?.beforePhotoUrls) ? report.beforePhotoUrls.length : 0;
    const draft = Array.isArray(draftUris) ? draftUris.length : 0;
    return uploaded + draft;
  }, [report, draftUris]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10 }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Report not found.</Text>
          <View style={{ height: 12 }} />
          <AppButton
            title="Back"
            variant="secondary"
            onPress={() => router.replace("/citizen/reports")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "900" }}>
          {isLocked ? "Report Details" : "Edit Draft"}
        </Text>

        <Text style={{ opacity: 0.75 }}>
          Mode: {report.mode || "DRAFT"} • Status: {report.status || "DRAFT"}
        </Text>

        <AppButton title="Back" variant="secondary" onPress={() => router.back()} />

        <Text style={{ fontWeight: "900", marginTop: 10 }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          editable={!isLocked && !saving}
          placeholder="Title"
          style={{
            borderWidth: 1,
            borderColor: "#111",
            padding: 12,
            borderRadius: 14,
            opacity: isLocked ? 0.6 : 1,
          }}
        />

        <Text style={{ fontWeight: "900" }}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          editable={!isLocked && !saving}
          placeholder="Description"
          multiline
          style={{
            borderWidth: 1,
            borderColor: "#111",
            padding: 12,
            borderRadius: 14,
            minHeight: 110,
            textAlignVertical: "top",
            opacity: isLocked ? 0.6 : 1,
          }}
        />

        <Text style={{ fontWeight: "900" }}>Category</Text>
        <View style={{ gap: 10 }}>
          {CATEGORIES.map((c) => (
            <AppButton
              key={c}
              title={c}
              variant={category === c ? "primary" : "secondary"}
              onPress={() => !isLocked && !saving && setCategory(c)}
            />
          ))}
        </View>

        <Text style={{ fontWeight: "900", marginTop: 10 }}>Location</Text>
        {report.geo?.latitude ? (
          <Text style={{ opacity: 0.8 }}>
            Lat: {Number(report.geo.latitude).toFixed(6)} | Lng:{" "}
            {Number(report.geo.longitude).toFixed(6)}
          </Text>
        ) : (
          <Text style={{ opacity: 0.6 }}>No location saved yet.</Text>
        )}

        <Text style={{ fontWeight: "900", marginTop: 10 }}>Photos</Text>
        <Text style={{ opacity: 0.8 }}>
          {photoCount} photo(s) • Draft: {draftUris.length}/5
        </Text>

        {!isLocked ? (
          <>
            <AppButton
              title={`Pick / Add photos (${draftUris.length}/5)`}
              variant="secondary"
              onPress={pickPhotos}
              disabled={saving}
            />

            <Text style={{ opacity: 0.65 }}>
              Long-press a photo to remove it from the draft.
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {draftUris.map((uri) => (
                <Pressable
                  key={uri}
                  onLongPress={() => !saving && removeDraftUri(uri)}
                  style={{ borderRadius: 14, overflow: "hidden" }}
                >
                  <Image
                    source={{ uri }}
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#111",
                    }}
                  />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {!isLocked ? (
          <View style={{ gap: 10, marginTop: 10 }}>
            <AppButton title={saving ? "Saving..." : "Save changes"} onPress={saveDraftChanges} />
            <AppButton
              title={saving ? "Submitting..." : "Submit (locks report)"}
              variant="secondary"
              onPress={submitDraft}
            />
            <AppButton
              title="Delete draft"
              variant="secondary"
              onPress={deleteDraft}
              disabled={saving}
            />
          </View>
        ) : (
          <View style={{ marginTop: 10 }}>
            <Text style={{ opacity: 0.7 }}>
              This report is submitted and locked. You can view updates but cannot edit it.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
