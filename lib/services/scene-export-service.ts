import { PassThrough } from "stream";
import PDFDocument from "pdfkit";
import { createRequire } from "module";
import { APP_NAME } from "@/lib/constants/branding";
import type { Scene, Sentence } from "@/types/sentence";
import { getSentenceTranslationFields } from "@/lib/services/dialect-translation-service";
import type { Dialect } from "@/lib/constants/dialect";
import { listAudioMetadataForSentenceIds } from "@/lib/supabase/server-data";
import { getR2Object, putR2Object, getAudioR2Key } from "@/lib/storage/r2-client";
import { createAdminClient } from "@/lib/supabase/admin";

const nodeRequire = createRequire(import.meta.url);
const archiver = nodeRequire("archiver") as (
  format: string,
  options?: { zlib?: { level: number } }
) => import("archiver").Archiver;

const INK = "#1c1917";
const MUTED = "#78716c";
const PAPER = "#faf7f2";
const ACCENT = "#0d9488";

export type SceneExportJobRow = {
  id: string;
  userId: string;
  sceneKey: string;
  status: "pending" | "processing" | "ready" | "failed";
  dialect: Dialect;
  resultR2Key: string | null;
  resultByteSize: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

function mapJob(row: Record<string, unknown>): SceneExportJobRow {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    sceneKey: row.scene_key as string,
    status: row.status as SceneExportJobRow["status"],
    dialect: (row.dialect as Dialect) ?? "standard",
    resultR2Key: (row.result_r2_key as string | null) ?? null,
    resultByteSize: (row.result_byte_size as number | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

export async function createSceneExportJob(params: {
  userId: string;
  sceneKey: string;
  dialect: Dialect;
}): Promise<SceneExportJobRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("scene_export_jobs")
    .insert({
      user_id: params.userId,
      scene_key: params.sceneKey,
      dialect: params.dialect,
      status: "pending",
    })
    .select("*")
    .maybeSingle();
  if (error || !data) {
    console.warn("createSceneExportJob failed:", error?.message);
    return null;
  }
  return mapJob(data);
}

export async function getSceneExportJob(
  jobId: string,
  userId: string
): Promise<SceneExportJobRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("scene_export_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return mapJob(data);
}

async function updateJob(
  jobId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) return;
  await supabase
    .from("scene_export_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

function buildPdfBuffer(params: {
  title: string;
  description: string;
  sentences: Sentence[];
  translations?: Record<string, { japanese?: string | null; reading?: string | null }>;
  dialect: Dialect;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: "A4",
      info: {
        Title: `${params.title} — ${APP_NAME}`,
        Author: APP_NAME,
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(PAPER);
    doc.fillColor(ACCENT).fontSize(10).text(APP_NAME.toUpperCase(), 48, 40);
    doc.fillColor(INK).fontSize(22).text(params.title, 48, 58, { width: 500 });
    doc
      .fillColor(MUTED)
      .fontSize(10)
      .text(params.description || "Scene export", { width: 500 });
    doc.moveDown(1.2);

    params.sentences.forEach((sentence, index) => {
      const fields = getSentenceTranslationFields(
        sentence.id,
        params.dialect,
        params.translations as never,
        sentence
      );
      const n = String(index + 1).padStart(3, "0");
      doc.fillColor(ACCENT).fontSize(9).text(n);
      doc.fillColor(INK).fontSize(11).text(sentence.english ?? "", {
        width: 500,
      });
      if (fields?.japanese) {
        doc.fillColor(INK).fontSize(12).text(fields.japanese, { width: 500 });
      }
      if (fields?.reading) {
        doc.fillColor(MUTED).fontSize(9).text(fields.reading, { width: 500 });
      }
      doc.moveDown(0.6);
      if (doc.y > doc.page.height - 72) {
        doc.addPage();
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(PAPER);
        doc.y = 48;
      }
    });

    doc.end();
  });
}

async function buildZipBuffer(params: {
  pdf: Buffer;
  sceneKey: string;
  sentences: Sentence[];
  dialect: Dialect;
}): Promise<Buffer> {
  const archive = archiver("zip", { zlib: { level: 5 } });
  const pass = new PassThrough();
  const chunks: Buffer[] = [];
  pass.on("data", (c) => chunks.push(c));

  const done = new Promise<Buffer>((resolve, reject) => {
    pass.on("end", () => resolve(Buffer.concat(chunks)));
    pass.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(pass);
  archive.append(params.pdf, { name: `${params.sceneKey}.pdf` });

  const ids = params.sentences.map((s) => s.id);
  const meta = await listAudioMetadataForSentenceIds(ids);
  const bySentence = new Map<string, (typeof meta)[number]>();
  for (const row of meta) {
    if ((row.dialect ?? "standard") !== params.dialect) continue;
    const key = row.sentence_id;
    if (!bySentence.has(key) || row.speaker === "A") {
      bySentence.set(key, row);
    }
  }

  for (let i = 0; i < params.sentences.length; i++) {
    const sentence = params.sentences[i]!;
    const row = bySentence.get(sentence.id);
    const r2Key = row?.r2_key ?? (row?.text_hash ? getAudioR2Key(row.text_hash) : null);
    if (!r2Key) continue;
    const buf = await getR2Object(r2Key);
    if (!buf) continue;
    const n = String(i + 1).padStart(3, "0");
    archive.append(buf, { name: `audio/${n}.mp3` });
  }

  await archive.finalize();
  return done;
}

export async function processSceneExportJob(params: {
  jobId: string;
  userId: string;
  sceneKey: string;
  scene: Scene;
  dialect: Dialect;
  translations?: Record<string, unknown>;
}): Promise<SceneExportJobRow | null> {
  await updateJob(params.jobId, { status: "processing" });

  try {
    const title =
      params.scene.title?.trim() ||
      params.sceneKey.replace(/_/g, " ");
    const pdf = await buildPdfBuffer({
      title,
      description: params.scene.description,
      sentences: params.scene.sentences,
      translations: params.translations as never,
      dialect: params.dialect,
    });
    const zip = await buildZipBuffer({
      pdf,
      sceneKey: params.sceneKey,
      sentences: params.scene.sentences,
      dialect: params.dialect,
    });

    const r2Key = `exports/${params.userId}/${params.jobId}.zip`;
    const ok = await putR2Object(r2Key, zip, "application/zip");
    if (!ok) {
      throw new Error("Failed to upload export to storage");
    }

    await updateJob(params.jobId, {
      status: "ready",
      result_r2_key: r2Key,
      result_byte_size: zip.byteLength,
      completed_at: new Date().toISOString(),
      error_message: null,
    });

    return getSceneExportJob(params.jobId, params.userId);
  } catch (err) {
    await updateJob(params.jobId, {
      status: "failed",
      error_message: err instanceof Error ? err.message : "Export failed",
      completed_at: new Date().toISOString(),
    });
    return getSceneExportJob(params.jobId, params.userId);
  }
}
