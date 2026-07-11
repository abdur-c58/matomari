import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import {
  getR2AccessKeyId,
  getR2AccountId,
  getR2BucketName,
  getR2SecretAccessKey,
  isR2Configured,
} from "@/lib/env";

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

export { isR2Configured };

export function getAudioR2Key(hash: string): string {
  return `audio/${hash}.mp3`;
}

export async function r2ObjectExists(key: string): Promise<boolean> {
  const client = getR2Client();
  if (!client) return false;

  try {
    await client.send(
      new HeadObjectCommand({ Bucket: getR2BucketName(), Key: key })
    );
    return true;
  } catch {
    return false;
  }
}

export async function getR2Object(key: string): Promise<Buffer | null> {
  const client = getR2Client();
  if (!client) return null;

  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: getR2BucketName(), Key: key })
    );
    const bytes = await response.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch {
    return null;
  }
}

export async function putR2Object(
  key: string,
  body: Buffer,
  contentType = "audio/mpeg"
): Promise<boolean> {
  const client = getR2Client();
  if (!client) return false;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: getR2BucketName(),
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function deleteR2Object(key: string): Promise<boolean> {
  const client = getR2Client();
  if (!client) return false;

  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: key })
    );
    return true;
  } catch {
    return false;
  }
}

export async function listR2KeysWithPrefix(prefix: string): Promise<string[]> {
  const client = getR2Client();
  if (!client) return [];

  const keys: string[] = [];
  let continuationToken: string | undefined;

  try {
    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: getR2BucketName(),
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );
      for (const item of response.Contents ?? []) {
        if (item.Key) keys.push(item.Key);
      }
      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);
  } catch {
    return keys;
  }

  return keys;
}

export async function deleteAllR2Audio(): Promise<number> {
  const keys = await listR2KeysWithPrefix("audio/");
  let deleted = 0;
  for (const key of keys) {
    if (await deleteR2Object(key)) deleted++;
  }
  return deleted;
}
