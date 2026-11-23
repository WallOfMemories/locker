// NEW: shrinks a big phone photo BEFORE it is uploaded.
//
// A 10–50 MB photo over a mobile connection is what made the upload time out
// ("Max retry time for operation exceeded") after the person had already
// paid. This resizes the longest side to 2560 px and re-saves it at good
// quality — typically 1–3 MB, still sharp on any screen — so the upload takes
// seconds instead of minutes.
//
// Safe by design: small photos are left alone, a result that is not smaller
// than the original is thrown away, and if anything fails the ORIGINAL file
// is used.

const MAX_SIDE = 2560;
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024;
const QUALITY = 0.85;

async function decode(file) {
  try {
    // keeps the photo the right way up (phone photos carry a rotation flag)
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(file);
  }
}

export async function compressImage(file) {
  try {
    if (!file || file.size <= SKIP_BELOW_BYTES) return file;

    const bitmap = await decode(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";

    if (outType === "image/jpeg") {
      // JPEG has no transparency: paint white underneath.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, outType, QUALITY)
    );

    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    const extension = outType === "image/png" ? "png" : "jpg";

    return new File([blob], `${base}.${extension}`, {
      type: outType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}