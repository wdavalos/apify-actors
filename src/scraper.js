const Apify = require("apify");
const { log } = Apify.util;

/**
 * Scrape a single Wirecutter review page using Cheerio
 * Falls back to Playwright if Cheerio fails
 */
async function scrapeReview(page, url) {
  // First try Cheerio (faster)
  try {
    const html = await page.content();
    const $ = cheerio.load(html);

    // Verify this is a Wirecutter review page
    const title = $("h1").first().text();
    if (!title || title.trim().length === 0) {
      throw new Error("Not a valid review page — no h1 found");
    }

    return { html, $, page, url };
  } catch (cheerioError) {
    // Fallback to Playwright for JS-rendered content
    log.warning(`Cheerio failed, falling back to Playwright: ${cheerioError.message}`);
    return scrapeWithPlaywright(page, url);
  }
}

/**
 * Playwright fallback for JS-rendered widgets
 */
async function scrapeWithPlaywright(page, url) {
  // Wait for main content to load
  await page.waitForSelector("h1", { timeout: 10000 });

  // Extract data using Playwright's evaluate
  const data = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const ratingEl = document.querySelector('[class*="rating"]');
    const priceEl = document.querySelector('[class*="price"]');

    return {
      html: document.documentElement.outerHTML,
      title: h1 ? h1.textContent : "",
      rating: ratingEl ? ratingEl.textContent : "",
      price: priceEl ? priceEl.textContent : ""
    };
  });

  // Return a cheerio-like interface
  const cheerio = require("cheerio");
  const $ = cheerio.load(data.html);

  return { html: data.html, $, page, url, raw: data };
}

/**
 * Scrape a category page to extract all review URLs
 */
async function scrapeCategoryPage(page, categoryUrl, category) {
  const urls = [];

  // Wait for review grid to load
  await page.waitForSelector("a[href*='/reviews/']", { timeout: 10000 });

  // Extract all review links
  const links = await page.$$eval("a[href*='/reviews/']", links => {
    return links.map(link => {
      const href = link.href;
      // Only include actual review pages, not category or tag pages
      if (href.includes("/reviews/") && !href.includes("/category/")) {
        return href.split("?")[0].split("#")[0]; // Clean URL
      }
      return null;
    }).filter(Boolean);
  });

  // Deduplicate
  const uniqueUrls = [...new Set(links)];

  return uniqueUrls;
}

/**
 * Discover all review URLs from a category index page
 */
async function discoverCategoryUrls(category, { proxyConfiguration }) {
  const categoryUrls = {
    electronics: "https://nytimes.com/wirecutter/category/electronics/",
    home: "https://nytimes.com/wirecutter/category/home/",
    kitchen: "https://nytimes.com/wirecutter/category/kitchen/",
    outdoor: "https://nytimes.com/wirecutter/category/outdoor/",
    health: "https://nytimes.com/wirecutter/category/health/",
    families: "https://nytimes.com/wirecutter/category/families/",
    money: "https://nytimes.com/wirecutter/category/money/"
  };

  const baseUrl = categoryUrls[category];
  if (!baseUrl) {
    throw new Error(`Unknown category: ${category}`);
  }

  const requestQueue = await Apify.openRequestQueue();
  await requestQueue.addRequest({ url: baseUrl });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency: 1,
    minConcurrency: 1,

    async requestHandler({ page }) {
      // Get URLs from the page
      const urls = await page.$$eval("a[href*='/reviews/']", links => {
        return links.map(link => {
          const href = link.href;
          if (href.includes("/reviews/") && !href.includes("/category/")) {
            return href.split("?")[0].split("#")[0];
          }
          return null;
        }).filter(Boolean);
      });

      // Store in kv store for retrieval
      const store = await Apify.openKeyValueStore();
      const existing = await store.getValue(`urls_${category}`) || [];
      const allUrls = [...new Set([...existing, ...urls])];
      await store.setValue(`urls_${category}`, allUrls);
    }
  });

  await crawler.run();

  // Retrieve collected URLs
  const store = await Apify.openKeyValueStore();
  const collectedUrls = await store.getValue(`urls_${category}`) || [];

  return collectedUrls;
}

/**
 * Discover all review URLs across all categories
 */
async function discoverAllUrls({ proxyConfiguration }) {
  const categories = ["electronics", "home", "kitchen", "outdoor", "health", "families", "money"];
  const allUrls = [];

  for (const category of categories) {
    log.info(`Discovering URLs for category: ${category}`);
    const urls = await discoverCategoryUrls(category, { proxyConfiguration });
    allUrls.push(...urls);
    log.info(`Found ${urls.length} URLs in ${category}`);
  }

  return [...new Set(allUrls)];
}

module.exports = {
  scrapeReview,
  scrapeWithPlaywright,
  scrapeCategoryPage,
  discoverCategoryUrls,
  discoverAllUrls
};
