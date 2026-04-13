const Apify = require("apify");
const { v4: uuidv4 } = require("uuid");
const { scrapeReview, scrapeCategory, scrapeFull } = require("./scraper");
const { extractReviewData } = require("./extractor");
const { discoverCategoryUrls, discoverAllUrls } = require("./urlDiscovery");

const { log } = Apify.util;

Apify.main(async () => {
  const input = await Apify.getInput();
  const {
    mode = "single",
    url,
    category,
    minRating,
    updatedAfter,
    proxyConfig = { useApifyProxy: true, groups: ["RESIDENTIAL"] }
  } = input;

  log.info(`Wirecutter scraper started. Mode: ${mode}`);

  const proxyConfiguration = input.proxyConfig?.useApifyProxy
    ? await Apify.createProxyConfiguration({
        groups: input.proxyConfig.groups || ["RESIDENTIAL"]
      })
    : undefined;

  const requestQueue = await Apify.openRequestQueue();
  const dataset = await Apify.openDataset();

  let urlsToScrape = [];

  // Discover URLs based on mode
  if (mode === "single") {
    if (!url) {
      throw new Error("URL is required for mode: single");
    }
    urlsToScrape = [url];
  } else if (mode === "category") {
    if (!category) {
      throw new Error("Category is required for mode: category");
    }
    log.info(`Discovering URLs for category: ${category}`);
    urlsToScrape = await discoverCategoryUrls(category, { proxyConfiguration });
    log.info(`Found ${urlsToScrape.length} review URLs in ${category}`);
  } else if (mode === "full") {
    log.info("Discovering all review URLs across all categories...");
    urlsToScrape = await discoverAllUrls({ proxyConfiguration });
    log.info(`Found ${urlsToScrape.length} total review URLs`);
  }

  // Add URLs to queue
  for (const reviewUrl of urlsToScrape) {
    await requestQueue.addRequest({ url: reviewUrl });
  }

  // Track stats
  let processed = 0;
  let failed = 0;

  // Process queue
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency: 1, // Be respectful — Wirecutter is part of NYT
    minConcurrency: 1,

    async requestHandler({ request, page, body }) {
      const url = request.url;

      try {
        log.info(`Scraping: ${url}`);

        // Scrape the page
        const pageData = await scrapeReview(page, url);

        // Extract structured data
        const structured = await extractReviewData(pageData, url);

        // Apply filters
        if (minRating && structured.review.rating < minRating) {
          log.info(`Skipping ${url} — rating ${structured.review.rating} < ${minRating}`);
          return;
        }

        if (updatedAfter) {
          const updatedDate = new Date(structured.review.lastUpdated);
          const cutoff = new Date(updatedAfter);
          if (updatedDate < cutoff) {
            log.info(`Skipping ${url} — updated ${updatedDate} < ${updatedAfter}`);
            return;
          }
        }

        // Save to dataset
        await dataset.pushData(structured);

        processed++;
        log.info(`✓ Processed (${processed}/${urlsToScrape.length}): ${structured.product.name}`);
      } catch (err) {
        log.error(`✗ Failed: ${url} — ${err.message}`);
        failed++;

        // Still save error info
        await dataset.pushData({
          id: uuidv4(),
          sourceUrl: url,
          scrapedAt: new Date().toISOString(),
          error: err.message,
          status: "failed"
        });
      }

      // Rate limit between requests
      await new Promise(r => setTimeout(r, 5000)); // 5 second delay
    },

    failedRequestHandler({ request, error }) {
      log.error(`Request failed permanently: ${request.url} — ${error.message}`);
    }
  });

  await crawler.run();

  // Final stats
  log.info(`
========== SCRAPE COMPLETE ==========
Processed: ${processed}
Failed: ${failed}
Total: ${urlsToScrape.length}
====================================
  `);

  // Store stats in key-value store
  const store = await Apify.openKeyValueStore();
  await store.setValue("stats", {
    processed,
    failed,
    total: urlsToScrape.length,
    mode,
    category,
    completedAt: new Date().toISOString()
  });
});
