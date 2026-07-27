/**
 * Copy all objects from the current R2 bucket to matomari-audio (same keys).
 *
 * Prerequisites:
 *   1. Create bucket `matomari-audio` in Cloudflare Dashboard (R2)
 *   2. R2_* credentials can read the source and write the dest
 *
 * Usage:
 *   npm run r2-copy-matomari
 *
 * Env:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   R2_SOURCE_BUCKET — optional; defaults to R2_BUCKET_NAME (your current live bucket)
 *   R2_DEST_BUCKET — optional; defaults to matomari-audio
 *
 * After a successful copy + playback smoke test, set R2_BUCKET_NAME=matomari-audio
 * in .env.local / Vercel and retire the old bucket after a soak period.
 */

import {
  CopyObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function assertBucketExists(
  client: S3Client,
  bucket: string,
  role: "source" | "destination"
) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err) {
    const code =
      err && typeof err === "object" && "name" in err
        ? String((err as { name?: string }).name)
        : "";
    const status =
      err &&
      typeof err === "object" &&
      "$metadata" in err &&
      (err as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
    throw new Error(
      `${role} bucket "${bucket}" is missing or inaccessible` +
        (code || status ? ` (${code || status})` : "") +
        (role === "destination"
          ? `\nCreate "${bucket}" in Cloudflare R2 first, then re-run.`
          : `\nSet R2_SOURCE_BUCKET to your existing bucket name (often the same as R2_BUCKET_NAME).`)
    );
  }
}

async function main() {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

  // Current live bucket is the SOURCE. New brand bucket is the DESTINATION.
  // Do NOT treat R2_BUCKET_NAME as dest — that was inverting the copy.
  const sourceBucket =
    process.env.R2_SOURCE_BUCKET?.trim() ||
    process.env.R2_BUCKET_NAME?.trim() ||
    "";
  const destBucket =
    process.env.R2_DEST_BUCKET?.trim() || "matomari-audio";

  if (!sourceBucket) {
    throw new Error(
      "No source bucket. Set R2_BUCKET_NAME (current) or R2_SOURCE_BUCKET in .env.local."
    );
  }

  if (sourceBucket === destBucket) {
    throw new Error(
      `Source and destination are both "${sourceBucket}". ` +
        `Create a new dest (default matomari-audio) or set R2_DEST_BUCKET.`
    );
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  console.log(`Source (current): ${sourceBucket}`);
  console.log(`Dest (new):       ${destBucket}`);

  await assertBucketExists(client, sourceBucket, "source");
  await assertBucketExists(client, destBucket, "destination");

  let copied = 0;
  let continuationToken: string | undefined;

  console.log(`Copying ${sourceBucket} → ${destBucket} (keys unchanged)…`);

  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: sourceBucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );

    for (const obj of listed.Contents ?? []) {
      if (!obj.Key) continue;
      await client.send(
        new CopyObjectCommand({
          Bucket: destBucket,
          Key: obj.Key,
          CopySource: `${sourceBucket}/${encodeURIComponent(obj.Key).replace(/%2F/g, "/")}`,
        })
      );
      copied += 1;
      if (copied % 50 === 0) console.log(`  …${copied} objects`);
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);

  console.log(`Done. Copied ${copied} objects.`);
  console.log(
    `Next: set R2_BUCKET_NAME=${destBucket} in .env.local / Vercel, smoke-test audio, then delete ${sourceBucket} after soak.`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
