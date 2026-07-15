import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  getR2AccessKeyId,
  getR2AccountId,
  getR2BucketName,
  getR2SecretAccessKey,
  isR2Configured,
} from "@/lib/env";
import { S3Client } from "@aws-sdk/client-s3";

function getR2Client(): S3Client | null {
  const accountId = getR2AccountId();
  const accessKeyId = getR2AccessKeyId();
  const secretAccessKey = getR2SecretAccessKey();
  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/** Short-lived GET URL for an R2 audio object (browser streaming). */
export async function getSignedAudioUrl(
  r2Key: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!isR2Configured()) return null;
  const client = getR2Client();
  if (!client) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: getR2BucketName(),
      Key: r2Key,
    });
    return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  } catch {
    return null;
  }
}
