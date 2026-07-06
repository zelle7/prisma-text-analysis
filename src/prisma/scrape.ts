import * as cheerio from "cheerio";
import { fetch } from "undici";
import { extractPdfText } from "./pdf.js";
import type { EvidenceDocument } from "./types.js";

const MAX_TEXT = 20000;

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function extractHtmlText(html: string): { title?: string; text: string; discoveredUrls: string[] } {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer, header").remove();
  const title = normalizeWhitespace($("title").first().text()) || undefined;
  const text = normalizeWhitespace($("body").text()).slice(0, MAX_TEXT);
  const discoveredUrls = $("a[href]")
    .map((_, element) => $(element).attr("href") ?? "")
    .get()
    .filter((href) => /\.pdf($|\?)/i.test(href) || /evaluation|bericht|report|download/i.test(href));
  return { title, text, discoveredUrls };
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

export async function scrapeUrl(url: string, timeoutMs = 20000): Promise<EvidenceDocument[]> {
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
      return [{ url, finalUrl, contentType, text: "", excerpt: "", error: `HTTP ${response.status}` }];
    }

    if (contentType?.includes("pdf") || /\.pdf($|\?)/i.test(finalUrl)) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const text = (await extractPdfText(buffer)).slice(0, MAX_TEXT);
      return [{ url, finalUrl, contentType, text, excerpt: text.slice(0, 1000) }];
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
        },
      ];

      for (const discoveredUrl of absolutizeUrls(finalUrl, discoveredUrls).slice(0, 3)) {
        if (discoveredUrl === finalUrl) continue;
        const nested = await scrapeUrl(discoveredUrl, timeoutMs);
        results.push(...nested);
      }

      return results;
    }

    const text = normalizeWhitespace(body).slice(0, MAX_TEXT);
    return [{ url, finalUrl, contentType, text, excerpt: text.slice(0, 1000) }];
  } catch (error) {
    return [
      {
        url,
        text: "",
        excerpt: "",
        error: error instanceof Error ? error.message : String(error),
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
    const docs = await scrapeUrl(url);
    for (const doc of docs) {
      const key = doc.finalUrl ?? doc.url;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(doc);
    }
  }
  return results;
}
