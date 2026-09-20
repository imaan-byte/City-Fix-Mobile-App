import { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Alert, Button, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";
import { useRouter } from "expo-router";

import AppButton from "../../components/AppButton";
async function openInGoogleMaps(lat, lng, label = "Report Location") {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(
    label
  )}`;
  const ok = await Linking.canOpenURL(url);
  if (!ok) return Alert.alert("Can't open maps", url);
  return Linking.openURL(url);
}

export default function CitizenMap() {
  const router = useRouter();

  const [loadingLocation, setLoadingLocation] = useState(true);
  const [region, setRegion] = useState(null);

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // 1) Get GPS to center the map
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Location permission is required for map view.");
          setLoadingLocation(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        });
      } catch (e) {
        Alert.alert("Location error", e?.message || String(e));
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  // 2) Listen to current citizen reports
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoadingReports(false);
      return;
    }

    const q = query(collection(db, "reports"), where("citizenId", "==", uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setReports(items);
        setLoadingReports(false);
      },
      (err) => {
        console.log("Map reports listener error:", err);
        setLoadingReports(false);
        Alert.alert("Could not load reports", err?.message || String(err));
      }
    );

    return () => unsub();
  }, []);

  const locatedReports = useMemo(
    () => reports.filter((r) => r.geo?.latitude && r.geo?.longitude),
    [reports]
  );

  const missingLocationCount = reports.length - locatedReports.length;
  const isLoading = loadingLocation || loadingReports;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={{ padding: 20, gap: 10 }}>
        <Text style={{ fontSize: 28, fontWeight: "900" }}>Map View</Text>

        <Text style={{ opacity: 0.7, lineHeight: 20 }}>
          Showing {locatedReports.length} report(s) with location
          {missingLocationCount > 0 ? ` • ${missingLocationCount} without location` : ""}.
        </Text>

        <AppButton title="Back" variant="secondary" onPress={() => router.back()} />
      </View>

      {/* Body */}
      {isLoading || !region ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10 }}>Loading map...</Text>
        </View>
      ) : (
        <MapView style={{ flex: 1 }} initialRegion={region} showsUserLocation>
          {locatedReports.map((r) => (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.geo.latitude, longitude: r.geo.longitude }}
              title={r.title || r.category || "Report"}
              description={r.description || ""}
              onCalloutPress={() => {
                router.push({ pathname: "/citizen/edit", params: { reportId: r.id } });
              }}
              onPress={() => {
                // keep press simple; callout press edits
              }}
            />
          ))}
        </MapView>
      )}
    </SafeAreaView>
  );
}
