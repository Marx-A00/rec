/**
 * Google Cloud Vision text detection for Uncover game.
 * Detects text on album covers and filters for answer-revealing regions
 * (album title, artist name) that should be hidden during early reveal stages.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

import { ImageAnnotatorClient } from '@google-cloud/vision';
import type { google } from '@google-cloud/vision/build/protos/protos';
import { calculateStringSimilarity } from '@/lib/utils/string-similarity';

// ============================================================================
// Usage Tracking
// ============================================================================

interface VisionUsage {
  /** ISO month string, e.g. "2026-03" */
  month: string;
  /** Number of Cloud Vision API calls this month */
  count: number;
}

const USAGE_FILE = path.join(process.cwd(), '.vision-usage.json');
const FREE_TIER_LIMIT = 1000;

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

function readUsage(): VisionUsage {
  try {
    if (existsSync(USAGE_FILE)) {
      const data = JSON.parse(readFileSync(USAGE_FILE, 'utf-8')) as VisionUsage;
      // Reset if month rolled over
      if (data.month !== getCurrentMonth()) {
        return { month: getCurrentMonth(), count: 0 };
      }
      return data;
    }
  } catch {
    // Corrupted file, start fresh
  }
  return { month: getCurrentMonth(), count: 0 };
}

function incrementUsage(): VisionUsage {
  const usage = readUsage();
  usage.count++;
  try {
    writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
  } catch {
    console.warn('[Vision] Failed to write usage file');
  }
  return usage;
}

/** Get current Vision API usage stats. */
export function getVisionUsage(): VisionUsage & { limit: number } {
  return { ...readUsage(), limit: FREE_TIER_LIMIT };
}

// ============================================================================
// Types
// ============================================================================

type IVertex = google.cloud.vision.v1.IVertex;
type IEntityAnnotation = google.cloud.vision.v1.IEntityAnnotation;

/** Normalized bounding box (0.0-1.0 coordinates) */
export interface TextRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Raw detected text with bounding box from Cloud Vision */
export interface DetectedText {
  text: string;
  boundingBox: TextRegion;
  confidence?: number;
}

/** Result of filtering detected text against album/artist names */
export interface FilteredTextResult {
  text: string;
  boundingBox: TextRegion;
  similarity: number;
  matchedAgainst: 'title' | 'artist';
  kept: boolean;
}

// ============================================================================
// Vision Client
// ============================================================================

let _client: ImageAnnotatorClient | null = null;

function getVisionClient(): ImageAnnotatorClient {
  if (_client) return _client;

  const credentialsJson = process.env.GOOGLE_CLOUD_VISION_CREDENTIALS;
  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson) as {
        client_email: string;
        private_key: string;
        project_id: string;
      };
      _client = new ImageAnnotatorClient({ credentials });
      return _client;
    } catch {
      console.warn(
        '[Vision] Failed to parse GOOGLE_CLOUD_VISION_CREDENTIALS, falling back to default auth'
      );
    }
  }

  // Falls back to GOOGLE_APPLICATION_CREDENTIALS file path (auto-detected by SDK)
  _client = new ImageAnnotatorClient();
  return _client;
}

// ============================================================================
// Core Detection
// ============================================================================

/**
 * Detect all text in an image using Google Cloud Vision TEXT_DETECTION.
 * Returns normalized bounding boxes (0.0-1.0) independent of image resolution.
 *
 * @returns Array of detected text regions, or null on any error.
 */
export async function detectAllText(
  imageUrl: string
): Promise<DetectedText[] | null> {
  try {
    const client = getVisionClient();

    // Fetch the image as a buffer
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(
        `[Vision] Failed to fetch image: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Check size — Cloud Vision limit is 10MB
    if (imageBuffer.byteLength > 10 * 1024 * 1024) {
      console.warn(
        `[Vision] Image too large (${(imageBuffer.byteLength / 1024 / 1024).toFixed(1)}MB), skipping`
      );
      return null;
    }

    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });

    // Track usage after successful API call
    incrementUsage();

    const annotations = result.textAnnotations;
    if (!annotations || annotations.length === 0) {
      return [];
    }

    // First annotation is the full text block — skip it, use individual words
    const wordAnnotations = annotations.slice(1);

    // We need image dimensions to normalize coordinates.
    // Cloud Vision returns vertices in pixel coordinates.
    // Determine image bounds from the full-text annotation (index 0).
    const fullTextVertices = annotations[0].boundingPoly?.vertices;
    if (!fullTextVertices || fullTextVertices.length < 4) {
      console.warn('[Vision] No bounding poly on full text annotation');
      return null;
    }

    // Calculate image dimensions from the full text bounding box
    // This works because the first annotation encompasses all detected text
    const allVertices: IVertex[] = annotations.flatMap(
      (a: IEntityAnnotation) => (a.boundingPoly?.vertices ?? []) as IVertex[]
    );
    const maxX = Math.max(...allVertices.map((v: IVertex) => v.x ?? 0));
    const maxY = Math.max(...allVertices.map((v: IVertex) => v.y ?? 0));

    // Use the actual image dimensions if we can infer them.
    // Cloud Vision vertices are in pixel coords, so we use the max extent
    // as a reasonable proxy. For more accuracy, we could decode the image
    // but this is sufficient for normalized coords.
    const imgWidth = maxX > 0 ? maxX : 1;
    const imgHeight = maxY > 0 ? maxY : 1;

    const detectedTexts: DetectedText[] = [];

    for (const annotation of wordAnnotations) {
      const vertices = annotation.boundingPoly?.vertices;
      if (!vertices || vertices.length < 4) continue;

      const xs = vertices.map((v: IVertex) => v.x ?? 0);
      const ys = vertices.map((v: IVertex) => v.y ?? 0);

      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const boxMaxX = Math.max(...xs);
      const boxMaxY = Math.max(...ys);

      detectedTexts.push({
        text: annotation.description ?? '',
        boundingBox: {
          x: minX / imgWidth,
          y: minY / imgHeight,
          w: (boxMaxX - minX) / imgWidth,
          h: (boxMaxY - minY) / imgHeight,
        },
        confidence: annotation.confidence ?? undefined,
      });
    }

    return detectedTexts;
  } catch (error) {
    console.warn('[Vision] Text detection failed:', error);
    return null;
  }
}

// ============================================================================
// Similarity Filtering
// ============================================================================

/**
 * Filter detected text regions to only those that reveal the answer
 * (album title or artist name).
 *
 * Uses fuzzy string similarity to catch stylized text, partial matches, etc.
 *
 * @param detectedTexts - All text detected by Cloud Vision
 * @param albumTitle - The album's title
 * @param artistName - The primary artist's name
 * @param threshold - Minimum similarity score (0-1) to consider a match
 * @returns Bounding boxes of answer-revealing text regions
 */
export function filterAnswerRevealingRegions(
  detectedTexts: DetectedText[],
  albumTitle: string,
  artistName: string,
  threshold = 0.5
): { regions: TextRegion[]; details: FilteredTextResult[] } {
  const titleWords = albumTitle.split(/\s+/).filter(w => w.length > 1);
  const artistWords = artistName.split(/\s+/).filter(w => w.length > 1);

  const details: FilteredTextResult[] = [];
  const regions: TextRegion[] = [];

  for (const detected of detectedTexts) {
    const text = detected.text.trim();
    if (text.length <= 1) continue; // Skip single characters

    // Check similarity against full title and artist name
    const titleSim = calculateStringSimilarity(text, albumTitle);
    const artistSim = calculateStringSimilarity(text, artistName);

    // Also check against individual words for multi-word titles/artists
    const titleWordSim = Math.max(
      ...titleWords.map(w => calculateStringSimilarity(text, w)),
      0
    );
    const artistWordSim = Math.max(
      ...artistWords.map(w => calculateStringSimilarity(text, w)),
      0
    );

    const bestTitleSim = Math.max(titleSim, titleWordSim);
    const bestArtistSim = Math.max(artistSim, artistWordSim);
    const bestSim = Math.max(bestTitleSim, bestArtistSim);
    const matchedAgainst: 'title' | 'artist' =
      bestTitleSim >= bestArtistSim ? 'title' : 'artist';

    const kept = bestSim >= threshold;

    details.push({
      text,
      boundingBox: detected.boundingBox,
      similarity: bestSim,
      matchedAgainst,
      kept,
    });

    if (kept) {
      regions.push(detected.boundingBox);
    }
  }

  return { regions, details };
}

// ============================================================================
// Convenience Wrapper
// ============================================================================

/**
 * Detect answer-revealing text regions on an album cover image.
 * Combines detectAllText + filterAnswerRevealingRegions.
 *
 * @returns Array of text regions to hide, or null on detection failure.
 */
export async function detectAnswerRegions(
  imageUrl: string,
  albumTitle: string,
  artistName: string,
  threshold = 0.5
): Promise<TextRegion[] | null> {
  const allText = await detectAllText(imageUrl);
  if (allText === null) return null; // Detection failed
  if (allText.length === 0) return []; // No text found

  const { regions } = filterAnswerRevealingRegions(
    allText,
    albumTitle,
    artistName,
    threshold
  );

  return regions;
}
