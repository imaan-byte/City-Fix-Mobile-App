const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function guessMime(uri) {
  const lower = String(uri).toLowerCase();

  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";

  return "image/jpeg";
}

function guessName(uri) {
  const ext = String(uri).split(".").pop();
  const safeExt = ext && ext.length <= 5 ? ext : "jpg";

  return `upload-${Date.now()}.${safeExt}`;
}

export async function uploadUriToCloudinary(uri, folder = "reports") {
  if (!uri) {
    throw new Error("Missing image uri.");
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const form = new FormData();

  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);

  form.append("file", {
    uri,
    type: guessMime(uri),
    name: guessName(uri),
  });

  const res = await fetch(url, {
    method: "POST",
    body: form,
  });

  const json = await res.json();

  if (!res.ok) {
    const msg = json?.error?.message || "Cloudinary upload failed";
    throw new Error(msg);
  }

  if (!json?.secure_url) {
    throw new Error(
      "Cloudinary upload failed: no secure_url returned."
    );
  }

  return json.secure_url;
}
