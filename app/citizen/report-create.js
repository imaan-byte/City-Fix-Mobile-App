import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import AppButton from "../../components/AppButton";
import { uploadUriToCloudinary } from "../../firebase/uploadExternal";

const CATEGORIES = ["pothole", "streetlight", "waste", "missed bin", "flooding"];

export default function ReportCreate() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("pothole");
  const [geo, setGeo] = useState(null);

  const [localUris, setLocalUris] = useState([]);
  const [saving, setSaving] = useState(false);

  const getGPS = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission needed", "Location permission is required.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setGeo({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) {
      Alert.alert("Location error", e?.message || String(e));
    }
  };

  const pickPhotos = async () => {
    try {
      if (localUris.length >= 5) {
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
        selectionLimit: 5 - localUris.length,
        quality: 0.8,
      });

      if (!res.canceled) {
        const uris = (res.assets || []).map((a) => a.uri).filter(Boolean);
        setLocalUris((prev) => [...prev, ...uris].slice(0, 5));
      }
    } catch (e) {
      Alert.alert("Picker error", e?.message || String(e));
    }
  };

  const removeLocalUri = (uri) => {
    setLocalUris((prev) => prev.filter((x) => x !== uri));
  };

  const saveDraft = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return Alert.alert("Not logged in", "Please login again.");

    if (!title.trim() && !description.trim()) {
      return Alert.alert("Nothing to save", "Add at least a title or description.");
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "reports"), {
        citizenId: uid,
        title: title.trim(),
        description: description.trim(),
        category,
        geo: geo ?? null,

        draftPhotoUris: localUris,

        beforePhotoUrls: [],
        afterPhotoUrls: [],

        mode: "DRAFT",
        locked: false,
        status: "DRAFT",

        assignedEngineerId: null,
        assignedByDispatcherId: null,

        statusTimeline: [{ status: "DRAFT", at: Timestamp.now() }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Draft saved", "You can edit it later in My Reports.");
      router.replace("/citizen/reports");
    } catch (e) {
      console.log("SAVE DRAFT ERROR:", e);
      Alert.alert("Error", e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const submitReport = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return Alert.alert("Not logged in", "Please login again.");

    if (!title.trim()) return Alert.alert("Missing title", "Please add a title.");
    if (!description.trim()) return Alert.alert("Missing description", "Please add a description.");
    if (!geo) return Alert.alert("Missing location", "Please get GPS location.");
    if (localUris.length < 1) return Alert.alert("Missing photos", "Add at least 1 photo.");

    setSaving(true);
    try {
      const beforePhotoUrls = [];
      for (const uri of localUris) {
        const url = await uploadUriToCloudinary(uri, "reports/before");
        beforePhotoUrls.push(url);
      }

      await addDoc(collection(db, "reports"), {
        citizenId: uid,
        title: title.trim(),
        description: description.trim(),
        category,
        geo,

        beforePhotoUrls,
        afterPhotoUrls: [],

        draftPhotoUris: [],

        mode: "SUBMITTED",
        locked: true,
        status: "SUBMITTED",

        assignedEngineerId: null,
        assignedByDispatcherId: null,

        statusTimeline: [{ status: "SUBMITTED", at: Timestamp.now() }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Submitted", "Thanks for reporting!");
      router.replace("/citizen/home");
    } catch (e) {
      console.log("SUBMIT ERROR FULL:", e);
      Alert.alert("Submit failed", e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "900" }}>Report an Issue</Text>

        <AppButton title="Back" variant="secondary" onPress={() => router.back()} disabled={saving} />

        <TextInput
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
          editable={!saving}
          style={{ borderWidth: 1, borderColor: "#111", padding: 12, borderRadius: 14 }}
        />

        <TextInput
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          editable={!saving}
          multiline
          style={{
            borderWidth: 1,
            borderColor: "#111",
            padding: 12,
            borderRadius: 14,
            minHeight: 110,
            textAlignVertical: "top",
          }}
        />

        <Text style={{ fontWeight: "900", fontSize: 16, marginTop: 6 }}>Category</Text>
        <View style={{ gap: 10 }}>
          {CATEGORIES.map((c) => (
            <AppButton
              key={c}
              title={c}
              variant={category === c ? "primary" : "secondary"}
              onPress={() => setCategory(c)}
              disabled={saving}
            />
          ))}
        </View>

        <View style={{ height: 10 }} />

        <AppButton title="Get GPS location" variant="secondary" onPress={getGPS} disabled={saving} />
        {geo ? (
          <Text style={{ opacity: 0.7 }}>
            Lat: {geo.latitude.toFixed(6)} | Lng: {geo.longitude.toFixed(6)}
          </Text>
        ) : null}

        <AppButton
          title={`Pick photos (${localUris.length}/5)`}
          variant="secondary"
          onPress={pickPhotos}
          disabled={saving}
        />

        <Text style={{ opacity: 0.65 }}>Long-press a photo to remove it.</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {localUris.map((uri) => (
            <Pressable
              key={uri}
              onLongPress={() => !saving && removeLocalUri(uri)}
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

        {saving ? (
          <View style={{ marginTop: 6, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, opacity: 0.7 }}>Working…</Text>
          </View>
        ) : null}

        <View style={{ height: 10 }} />

        <AppButton title="Save Draft" variant="secondary" onPress={saveDraft} disabled={saving} />
        <AppButton title="Submit (locks report)" variant="primary" onPress={submitReport} disabled={saving} />
      </ScrollView>
    </SafeAreaView>
  );
}
