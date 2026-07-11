import * as cheerio from "cheerio";
import { fetch } from "undici";
import { extractPdfText } from "./pdf.js";
import type { EvidenceDocument } from "./types.js";

export interface ScrapeOptions {
  verbose?: boolean;
  timeoutMs?: number;
  maxDepth?: number;
  visited?: Set<string>;
  programName?: string;
}

interface DiscoveredLink {
  url: string;
  label: string;
}

function logVerbose(verbose: boolean | undefined, message: string): void {
  if (verbose) console.log(message);
}

const MAX_TEXT = 20000;
const MAX_DISCOVERED_URLS = 3;
const PROGRAM_STOPWORDS = new Set([
  "und",
  "oder",
  "für",
  "fuer",
  "der",
  "die",
  "das",
  "des",
  "den",
  "dem",
  "ein",
  "eine",
  "einer",
  "eines",
  "mit",
  "von",
  "im",
  "in",
  "am",
  "an",
  "auf",
  "the",
  "and",
  "for",
  "program",
  "programm",
  "projekt",
  "project",
  "school",
  "schule",
]);
const DISCOVERED_KEYWORDS = /evaluation|evalua|bericht|report|download|manual|konzept|theorie|implementation|material|studie|study|wirksam|effect/i;
const GENERIC_DISCOVERED_URL_PATTERN = /\/datenbank\/(alle|neu|information|informationen|vorschlag|suchen|leitlinien)($|[?#/])|wegweiser-gruene-liste\.de\/massnahmensuche\/filter|Musterprasentation_Rote_Liste|Info-Broschuere-Gruene-Liste|Begriffserkl[aä]rungen|\/tag\/|\/category\//i;

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function tokenizeProgramName(programName: string | undefined): string[] {
  if (!programName) return [];
  return [...new Set(
    programName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
      .filter((token) => !PROGRAM_STOPWORDS.has(token)),
  )];
}

function extractHtmlText(html: string): { title?: string; text: string; discoveredLinks: DiscoveredLink[] } {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer, header").remove();
  const title = normalizeWhitespace($("title").first().text()) || undefined;
  const text = normalizeWhitespace($("body").text()).slice(0, MAX_TEXT);
  const discoveredLinks = $("a[href]")
    .map((_, element) => {
      const href = $(element).attr("href") ?? "";
      const label = normalizeWhitespace($(element).text());
      return { url: href.trim(), label } satisfies DiscoveredLink;
    })
    .get()
    .filter((link) => Boolean(link.url));
  return { title, text, discoveredLinks };
}

function classifyDiscoveredUrl(url: string): "generic" | "candidate" {
  return /bewertungskriterien|rating-criteria|downloads($|\/)/i.test(url) || GENERIC_DISCOVERED_URL_PATTERN.test(url) ? "generic" : "candidate";
}

function absolutizeUrls(baseUrl: string, links: DiscoveredLink[]): DiscoveredLink[] {
  return links
    .map((link) => {
      try {
        return { ...link, url: new URL(link.url, baseUrl).toString() } satisfies DiscoveredLink;
      } catch {
        return undefined;
      }
    })
    .filter((value): value is DiscoveredLink => Boolean(value));
}

function scoreDiscoveredLink(link: DiscoveredLink, programTokens: string[], baseUrl: string): number {
  const haystack = `${link.url} ${link.label}`.toLowerCase();
  let score = 0;

  if (/\.pdf($|\?)/i.test(link.url)) score += 4;
  if (DISCOVERED_KEYWORDS.test(haystack)) score += 3;
  if (classifyDiscoveredUrl(link.url) === "generic") score -= 8;

  for (const token of programTokens) {
    if (link.url.toLowerCase().includes(token)) score += 5;
    if (link.label.toLowerCase().includes(token)) score += 4;
  }

  try {
    const base = new URL(baseUrl);
    const target = new URL(link.url);
    if (base.hostname === target.hostname) score += 1;
    if (base.pathname.split("/")[1] && target.pathname.includes(base.pathname.split("/")[1])) score += 1;
  } catch {
    // ignore
  }

  if (/\/programm\//i.test(link.url) && programTokens.length > 0 && !programTokens.some((token) => haystack.includes(token))) score -= 4;
  if (/suchen|suche|filter|index|kategorie|category|tag|archiv/i.test(haystack)) score -= 5;
  if (!/\.pdf($|\?)/i.test(link.url) && !DISCOVERED_KEYWORDS.test(haystack) && programTokens.length > 0 && !programTokens.some((token) => haystack.includes(token))) score -= 3;

  return score;
}

function selectDiscoveredLinks(baseUrl: string, links: DiscoveredLink[], programName: string | undefined, visited: Set<string>): DiscoveredLink[] {
  const programTokens = tokenizeProgramName(programName);
  return absolutizeUrls(baseUrl, links)
    .filter((link) => link.url !== baseUrl)
    .filter((link) => !visited.has(link.url))
    .map((link) => ({ link, score: scoreDiscoveredLink(link, programTokens, baseUrl) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_DISCOVERED_URLS)
    .map(({ link }) => link);
}

export async function scrapeUrl(
  url: string,
  timeoutMs = 20000,
  sourceType: "input" | "discovered" = "input",
  options: ScrapeOptions = {},
): Promise<EvidenceDocument[]> {
  const { verbose = false, maxDepth = 2, programName } = options;
  const visited = options.visited ?? new Set<string>();
  const depth = sourceType === "input" ? 0 : Math.max(0, 2 - maxDepth);
  let normalizedInputUrl = url;
  try {
    normalizedInputUrl = new URL(url).toString();
  } catch {
    normalizedInputUrl = url;
  }
  if (visited.has(normalizedInputUrl)) {
    logVerbose(verbose, `  [scrape:${sourceType}] skip already visited ${normalizedInputUrl}`);
    return [];
  }
  visited.add(normalizedInputUrl);
  logVerbose(verbose, `  [scrape:${sourceType}] start depth=${depth} ${normalizedInputUrl}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "prisma-analyser/0.1 (+local pi sdk script)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,text/plain;q=0.8,*/*;q=0.5",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") ?? undefined;
    const finalUrl = response.url;
    logVerbose(verbose, `  [scrape:${sourceType}] response ${response.status} ${finalUrl}${contentType ? ` (${contentType})` : ""}`);

    if (!response.ok) {
      logVerbose(verbose, `  [scrape:${sourceType}] non-ok response for ${url}: HTTP ${response.status}`);
      return [{ url, finalUrl, contentType, text: "", excerpt: "", error: `HTTP ${response.status}`, sourceType, relevanceHint: sourceType === "input" ? "candidate" : classifyDiscoveredUrl(finalUrl) }];
    }

    if (contentType?.includes("pdf") || /\.pdf($|\?)/i.test(finalUrl)) {
      logVerbose(verbose, `  [scrape:${sourceType}] reading PDF ${finalUrl}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const text = (await extractPdfText(buffer)).slice(0, MAX_TEXT);
      logVerbose(verbose, `  [scrape:${sourceType}] PDF extracted ${text.length} chars from ${finalUrl}`);
      return [{ url, finalUrl, contentType, text, excerpt: text.slice(0, 1000), sourceType, relevanceHint: sourceType === "input" ? "candidate" : classifyDiscoveredUrl(finalUrl) }];
    }

    const body = await response.text();

    if (contentType?.includes("html") || body.trim().startsWith("<")) {
      logVerbose(verbose, `  [scrape:${sourceType}] parsing HTML ${finalUrl}`);
      const { title, text, discoveredLinks } = extractHtmlText(body);
      const results: EvidenceDocument[] = [
        {
          url,
          finalUrl,
          title,
          contentType,
          text,
          excerpt: text.slice(0, 1000),
          sourceType,
          relevanceHint: sourceType === "input" ? "candidate" : classifyDiscoveredUrl(finalUrl),
        },
      ];

      const selectedDiscoveredLinks = selectDiscoveredLinks(finalUrl, discoveredLinks, programName, visited);
      logVerbose(verbose, `  [scrape:${sourceType}] selected ${selectedDiscoveredLinks.length} subpage(s) from ${finalUrl}`);
      if (verbose && selectedDiscoveredLinks.length) {
        for (const link of selectedDiscoveredLinks) {
          logVerbose(verbose, `    -> ${link.url} | ${link.label}`);
        }
      }

      if (maxDepth > 0) {
        for (const discoveredLink of selectedDiscoveredLinks) {
          logVerbose(verbose, `  [scrape:${sourceType}] following subpage ${discoveredLink.url}`);
          const nested = await scrapeUrl(discoveredLink.url, timeoutMs, "discovered", {
            ...options,
            maxDepth: maxDepth - 1,
            visited,
            programName,
          });
          results.push(...nested);
        }
      } else if (selectedDiscoveredLinks.length) {
        logVerbose(verbose, `  [scrape:${sourceType}] max depth reached at ${finalUrl}`);
      }

      logVerbose(verbose, `  [scrape:${sourceType}] done HTML ${finalUrl} -> ${results.length} doc(s)`);
      return results;
    }

    const text = normalizeWhitespace(body).slice(0, MAX_TEXT);
    logVerbose(verbose, `  [scrape:${sourceType}] plain text extracted ${text.length} chars from ${finalUrl}`);
    return [{ url, finalUrl, contentType, text, excerpt: text.slice(0, 1000), sourceType, relevanceHint: sourceType === "input" ? "candidate" : classifyDiscoveredUrl(finalUrl) }];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logVerbose(verbose, `  [scrape:${sourceType}] ERROR ${url}: ${message}`);
    return [
      {
        url,
        text: "",
        excerpt: "",
        error: message,
        sourceType,
        relevanceHint: sourceType === "input" ? "candidate" : "generic",
      },
    ];
  } finally {
    clearTimeout(timeout);
  }
}

export async function scrapeUrls(urls: string[], options: ScrapeOptions = {}): Promise<EvidenceDocument[]> {
  const { verbose = false, timeoutMs = 20000, maxDepth = 2 } = options;
  const visited = options.visited ?? new Set<string>();
  const unique = [...new Set(urls.filter(Boolean))];
  const results: EvidenceDocument[] = [];
  const seen = new Set<string>();
  logVerbose(verbose, `  [scrape] starting ${unique.length} input URL(s)`);
  for (const url of unique) {
    const docs = await scrapeUrl(url, timeoutMs, "input", { ...options, maxDepth, visited });
    for (const doc of docs) {
      const key = doc.finalUrl ?? doc.url;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(doc);
    }
    logVerbose(verbose, `  [scrape] finished input URL ${url} -> ${docs.length} doc(s)`);
  }
  logVerbose(verbose, `  [scrape] finished all URLs -> ${results.length} unique doc(s)`);
  return results;
}
