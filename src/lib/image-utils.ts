export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
export const MAX_IMAGE_SIZE_MB = 5;

export function fileToBase64(file: File, maxSizeMB = MAX_IMAGE_SIZE_MB): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      reject(new Error(`Unsupported file type: ${file.type}. Accepted: ${ACCEPTED_IMAGE_TYPES.join(", ")}`));
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      reject(new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: ${maxSizeMB}MB`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function isValidImageDataUrl(src: string): boolean {
  return /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/.test(src);
}
