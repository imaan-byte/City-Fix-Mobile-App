import { View, Text, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";

function RoleButton({ label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "100%",
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: "#000",
        borderRadius: 14,
        alignItems: "center",
        backgroundColor: "#fff"
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export default function RoleSelection() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      
      {/* TOP BUILDINGS */}
      <Image
        source={require("../../assets/images/buildings.jpeg")}
        style={{ width: "100%", height: 90 }}
        resizeMode="contain"
      />

      {/* CENTER CONTENT */}
      <View
        style={{
          flex: 1,
          padding: 24,
          justifyContent: "center",
          gap: 16
        }}
      >
        {/* LOGO */}
        <Image
          source={require("../../assets/images/icon.png")}
          style={{
            width: 140,
            height: 140,
            alignSelf: "center",
            marginBottom: 10
          }}
          resizeMode="contain"
        />

        {/* TITLE */}
        <View
          style={{
            alignSelf: "center",
            borderWidth: 2,
            borderColor: "#000",
            paddingHorizontal: 20,
            paddingVertical: 6,
            marginBottom: 14
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "900" }}>
            CITY FIX
          </Text>
        </View>

        <Text style={{ fontSize: 20, fontWeight: "700", textAlign: "center" }}>
          Choose your role
        </Text>

        {/* ROLE BUTTONS */}
        <RoleButton
          label="Citizen (Login / Register)"
          onPress={() => router.push("/citizen/citizen-login")}
        />

        <RoleButton
          label="Dispatcher Login"
          onPress={() => router.push("/dispatcher/login")}
        />

        <RoleButton
          label="Engineer Login"
          onPress={() => router.push("/engineer/login")}
        />

        <RoleButton
          label="Quality Auditor Login"
          onPress={() => router.push("/qa/login")}
        />
      </View>

      {/* BOTTOM BUILDINGS */}
      <Image
        source={require("../../assets/images/buildings.jpeg")}
        style={{ width: "100%", height: 90 }}
        resizeMode="contain"
      />

      {/* FOOTER */}
      <Text
        style={{
          fontSize: 11,
          textAlign: "center",
          marginBottom: 6
        }}
      >
        Contact us on : +44 0789711267 · CityFixAssist@co.uk
      </Text>
    </View>
  );
}
