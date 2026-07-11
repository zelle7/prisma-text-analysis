import * as cheerio from "cheerio";
import { fetch } from "undici";
import { extractPdfText } from "./pdf.js";
import type { EvidenceDocument } from "./types.js";

const MAX_TEXT = 20000;
const MAX_DISCOVERED_URLS = 5;
const DISCOVERED_KEYWORDS = /evaluation|evalua|bericht|report|download|manual|konzept|theorie|about|programm|program|project|ueber|über|info|implementation|material/i;

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function extractHtmlText(html: string): { title?: string; text: string; discoveredUrls: string[] } {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer, header").remove();
  const title = normalizeWhitespace($("title").first().text()) || undefined;
  const text = normalizeWhitespace($("body").text()).slice(0, MAX_TEXT);
  const discoveredUrls = $("a[href]")
    .map((_, element) => {
      const href = $(element).attr("href") ?? "";
      const label = normalizeWhitespace($(element).text()).toLowerCase();
      return `${href} ${label}`.trim();
    })
    .get()
    .filter((value) => /\.pdf($|\?|\s)/i.test(value) || DISCOVERED_KEYWORDS.test(value))
    .map((value) => value.split(" ")[0]);
  return { title, text, discoveredUrls };
}

function classifyDiscoveredUrl(url: string): "generic" | "candidate" {
  return /bewertungskriterien|rating-criteria|downloads($|\/)/i.test(url) ? "generic" : "candidate";
}

function absolutizeUrls(baseUrl: string, links: string[]): string[] {
  return links
    .map((link) => {
      try {
        return new URL(link, baseUrl).toString();
      } catch {
        return undefined;
      }
    })
    .filter((value): value is string => Boolean(value));
}

export async function scrapeUrl(url: string, timeoutMs = 20000, sourceType: "input" | "discovered" = "input"): Promise<EvidenceDocument[]> {
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

    if (!response.ok) {
      return [{ url, finalUrl, contentType, text: "", excerpt: "", error: `HTTP ${response.status}`, sourceType, relevanceHint: sourceType === "input" ? "candidate" : classifyDiscoveredUrl(finalUrl) }];
    }

    if (contentType?.includes("pdf") || /\.pdf($|\?)/i.test(finalUrl)) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const text = (await extractPdfText(buffer)).slice(0, MAX_TEXT);
      return [{ url, finalUrl, contentType, text, excerpt: text.slice(0, 1000), sourceType, relevanceHint: sourceType === "input" ? "candidate" : classifyDiscoveredUrl(finalUrl) }];
    }

    const body = await response.text();

    if (contentType?.includes("html") || body.trim().startsWith("<")) {
      const { title, text, discoveredUrls } = extractHtmlText(body);
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

      const candidateDiscoveredUrls = absolutizeUrls(finalUrl, discoveredUrls)
        .filter((discoveredUrl) => discoveredUrl !== finalUrl)
        .filter((discoveredUrl) => classifyDiscoveredUrl(discoveredUrl) === "candidate")
        .slice(0, MAX_DISCOVERED_URLS);

      for (const discoveredUrl of candidateDiscoveredUrls) {
        const nested = await scrapeUrl(discoveredUrl, timeoutMs, "discovered");
        results.push(...nested);
      }

      return results;
    }

    const text = normalizeWhitespace(body).slice(0, MAX_TEXT);
    return [{ url, finalUrl, contentType, text, excerpt: text.slice(0, 1000), sourceType, relevanceHint: sourceType === "input" ? "candidate" : classifyDiscoveredUrl(finalUrl) }];
  } catch (error) {
    return [
      {
        url,
        text: "",
        excerpt: "",
        error: error instanceof Error ? error.message : String(error),
        sourceType,
        relevanceHint: sourceType === "input" ? "candidate" : "generic",
      },
    ];
  } finally {
    clearTimeout(timeout);
  }
}

export async function scrapeUrls(urls: string[]): Promise<EvidenceDocument[]> {
  const unique = [...new Set(urls.filter(Boolean))];
  const results: EvidenceDocument[] = [];
  const seen = new Set<string>();
  for (const url of unique) {
    const docs = await scrapeUrl(url, 20000, "input");
    for (const doc of docs) {
      const key = doc.finalUrl ?? doc.url;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(doc);
    }
  }
  return results;
}
