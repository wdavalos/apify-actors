const Apify = require("apify");
const { log } = Apify.util;

/**
 * Category to Wirecutter URL mapping
 */
const CATEGORY_URLS = {
  electronics: "https://nytimes.com/wirecutter/category/electronics/",
  home: "https://nytimes.com/wirecutter/category/home/",
  kitchen: "https://nytimes.com/wirecutter/category/kitchen/",
  outdoor: "https://nytimes.com/wirecutter/category/outdoor/",
  health: "https://nytimes.com/wirecutter/category/health/",
  families: "https://nytimes.com/wirecutter/category/families/",
  money: "https://nytimes.com/wirecutter/category/money/"
};

/**
 * Discover all review URLs from a category page
 * Handles pagination automatically
 */
async function discoverCategoryUrls(category, { proxyConfiguration }) {
  const baseUrl = CATEGORY_URLS[category];
  if (!baseUrl) {
    throw new Error(`Unknown category: ${category}. Valid: ${Object.keys(CATEGORY_URLS).join(", ")}`);
  }

  const allUrls = new Set();
  const requestQueue = await Apify.openRequestQueue();

  // Track discovered pages for pagination
  let currentPage = 1;
  const maxPages = 50; // Safety limit

  async function getUrlsFromPage(pageUrl) {
    log.info(`Scraping category page: ${pageUrl}`);

    await requestQueue.addRequest({ url: pageUrl });

    const crawler = new Apify.CheerioCrawler({
      requestQueue,
      proxyConfiguration,
      maxConcurrency: 1,

      async requestHandler({ page }) {
        // Extract review URLs from current page
        const pageUrls = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/reviews/"]'));
          return links
            .map(link => {
              const href = link.href;
              // Only actual review pages, not category/tag pages
              if (href.includes("/reviews/") &&
                  !href.includes("/category/") &&
                  !href.includes("/tag/") &&
                  !href.includes("/page/")) {
                // Clean URL
                return href.split("?")[0].split("#")[0];
              }
              return null;
            })
            .filter(Boolean);
        });

        pageUrls.forEach(url => allUrls.add(url));
        log.info(`Found ${pageUrls.length} review URLs on page ${currentPage}`);

        // Check for next page pagination
        const nextButton = await page.$('a[rel="next"], a[aria-label="Next"], .next-page a, a:contains("Next")');
        if (nextButton && currentPage < maxPages) {
          const nextHref = await nextButton.getAttribute("href");
          if (nextHref) {
            currentPage++;
            const nextUrl = nextHref.startsWith("http")
              ? nextHref
              : new URL(nextHref, pageUrl).href;
            await getUrlsFromPage(nextUrl);
          }
        }
      }
    });

    await crawler.run();
  }

  await getUrlsFromPage(baseUrl);

  return Array.from(allUrls);
}

/**
 * Discover all review URLs across ALL categories
 */
async function discoverAllUrls({ proxyConfiguration }) {
  const allUrls = [];

  for (const [category, url] of Object.entries(CATEGORY_URLS)) {
    log.info(`Discovering URLs for category: ${category}`);
    try {
      const urls = await discoverCategoryUrls(category, { proxyConfiguration });
      log.info(`Found ${urls.length} URLs in ${category}`);
      allUrls.push(...urls);
    } catch (err) {
      log.error(`Failed to discover ${category}: ${err.message}`);
    }
  }

  return [...new Set(allUrls)];
}

/**
 * Get total count of reviews across all categories
 * Useful for pricing estimation
 */
async function getTotalReviewCount({ proxyConfiguration }) {
  const allUrls = await discoverAllUrls({ proxyConfiguration });
  return allUrls.length;
}

module.exports = {
  discoverCategoryUrls,
  discoverAllUrls,
  getTotalReviewCount,
  CATEGORY_URLS
};
