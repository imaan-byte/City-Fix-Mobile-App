import { Pressable, Text } from "react-native";

export default function AppButton({ title, onPress, variant = "primary" }) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: "#111",
        backgroundColor: isPrimary ? "#111" : "#fff",
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        opacity: pressed ? 0.7 : 1,
        alignItems: "center",
      })}
    >
      <Text style={{ color: isPrimary ? "#fff" : "#111", fontWeight: "800", fontSize: 16 }}>
        {title}
      </Text>
    </Pressable>
  );
}
