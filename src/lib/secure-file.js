import { createFileSignedUrl } from '@/services/integrationsApi';

// Private file URIs returned by UploadPrivateFile are NOT http(s) URLs.
// Public URLs returned by UploadFile start with http.
export function isPrivateFileUri(url) {
  if (!url) return false;
  return !/^https?:\/\//i.test(url);
}

// Returns a short-lived signed URL for private file URIs, or the original
// URL for public files. The signed URL expires after `expiresInSec` so a
// student who scrapes the network tab gets a link that dies within minutes.
export async function resolveSecureFileUrl(url, expiresInSec = 300) {
  if (!isPrivateFileUri(url)) return url;
  const { signed_url } = await createFileSignedUrl({
    file_uri: url,
    expires_in: expiresInSec,
  });
  if (!signed_url) {
    throw new Error('Unable to generate a secure link for this file.');
  }
  return signed_url;
}