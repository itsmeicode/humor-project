const BASE_URL = 'https://api.almostcrackd.ai';

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
] as const;

export function isSupportedImageType(type: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(type as (typeof SUPPORTED_IMAGE_TYPES)[number]);
}

export type PipelineResult = {
  cdnUrl: string;
  imageId: string;
  captions: unknown[];
};

export type PipelineError = {
  step: 1 | 2 | 3 | 4;
  message: string;
  status?: number;
};

export async function uploadAndGenerateCaptions(
  accessToken: string,
  file: File
): Promise<PipelineResult> {
  const contentType = file.type;
  if (!isSupportedImageType(contentType)) {
    throw new Error(
      `Unsupported image type: ${contentType}. Allowed: ${SUPPORTED_IMAGE_TYPES.join(', ')}`
    );
  }

  const step1Res = await fetch(`${BASE_URL}/pipeline/generate-presigned-url`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contentType }),
  });

  if (!step1Res.ok) {
    const text = await step1Res.text();
    throw new Error(`Presigned URL failed (${step1Res.status}): ${text}`);
  }

  const step1 = (await step1Res.json()) as {
    presignedUrl: string;
    cdnUrl: string;
  };
  const { presignedUrl, cdnUrl } = step1;

  const step2Res = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });

  if (!step2Res.ok) {
    const text = await step2Res.text();
    throw new Error(`Upload failed (${step2Res.status}): ${text}`);
  }

  const step3Res = await fetch(`${BASE_URL}/pipeline/upload-image-from-url`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl: cdnUrl,
      isCommonUse: false,
    }),
  });

  if (!step3Res.ok) {
    const text = await step3Res.text();
    throw new Error(`Register image failed (${step3Res.status}): ${text}`);
  }

  const step3 = (await step3Res.json()) as { imageId: string };
  const { imageId } = step3;

  const step4Res = await fetch(`${BASE_URL}/pipeline/generate-captions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageId }),
  });

  if (!step4Res.ok) {
    const text = await step4Res.text();
    throw new Error(`Generate captions failed (${step4Res.status}): ${text}`);
  }

  const captions = (await step4Res.json()) as unknown[];
  if (!Array.isArray(captions)) {
    throw new Error('Caption response was not an array');
  }

  return { cdnUrl, imageId, captions };
}
