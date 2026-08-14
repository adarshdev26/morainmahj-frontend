import { post } from '@/services/http';

/**
 * Application-owned integration endpoints.
 * Backend may return 501 until upload/email storage is wired.
 */

export async function uploadFile({ file }) {
  // Multipart will replace this once an upload route exists; for now post metadata
  // so the request hits our API and surfaces a clear 501.
  return post('/api/integrations/upload-file', {
    filename: file?.name,
    type: file?.type,
    size: file?.size,
  });
}

export async function uploadPrivateFile({ file }) {
  return post('/api/integrations/upload-private-file', {
    filename: file?.name,
    type: file?.type,
    size: file?.size,
  });
}

export async function createFileSignedUrl(payload) {
  return post('/api/integrations/create-file-signed-url', payload || {});
}

export async function sendEmail(payload) {
  return post('/api/integrations/send-email', payload || {});
}

export const Core = {
  UploadFile: uploadFile,
  UploadPrivateFile: uploadPrivateFile,
  CreateFileSignedUrl: createFileSignedUrl,
  SendEmail: sendEmail,
};

export default { Core, uploadFile, uploadPrivateFile, createFileSignedUrl, sendEmail };
