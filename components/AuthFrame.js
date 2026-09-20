import { View, Text, Image } from "react-native";

export default function AuthFrame({ title, children }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      
      {/* TOP BUILDINGS */}
      <Image
        source={require("../assets/images/buildings.jpeg")}
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
          source={require("../assets/images/icon.png")}
          style={{
            width: 130,
            height: 130,
            alignSelf: "center"
          }}
          resizeMode="contain"
        />

        {/* TITLE */}
        {title ? (
          <View
            style={{
              alignSelf: "center",
              borderWidth: 2,
              borderColor: "#000",
              paddingHorizontal: 20,
              paddingVertical: 6,
              marginBottom: 10
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "900" }}>
              {title}
            </Text>
          </View>
        ) : null}

        {/* SCREEN CONTENT */}
        {children}
      </View>

      {/* BOTTOM BUILDINGS */}
      <Image
        source={require("../assets/images/buildings.jpeg")}
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
