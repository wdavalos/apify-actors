const { v4: uuidv4 } = require("uuid");

/**
 * Extract structured review data from a Wirecutter page
 * @param {Object} pageData - { html, $, page, url }
 * @param {string} sourceUrl - Original URL
 * @returns {Object} Structured review data
 */
async function extractReviewData(pageData, sourceUrl) {
  const { $, page, url } = pageData;

  // Extract product name (h1 title)
  const productName = extractProductName($);

  // Extract category from breadcrumbs
  const category = extractCategory($);

  // Extract subcategory
  const subcategory = extractSubcategory($);

  // Extract rating
  const rating = extractRating($);

  // Extract price
  const price = extractPrice($);

  // Extract pros
  const pros = extractPros($);

  // Extract cons
  const cons = extractCons($);

  // Extract verdict
  const verdict = extractVerdict($);

  // Extract author
  const author = extractAuthor($);

  // Extract dates
  const { publishedDate, lastUpdated } = extractDates($, page);

  // Extract comparison products
  const comparisonProducts = extractComparisonProducts($);

  return {
    id: uuidv4(),
    sourceUrl: url,
    scrapedAt: new Date().toISOString(),
    product: {
      name: productName,
      category: category,
      subcategory: subcategory || null
    },
    review: {
      rating: rating,
      price: price,
      pros: pros,
      cons: cons,
      verdict: verdict,
      author: author,
      publishedDate: publishedDate,
      lastUpdated: lastUpdated
    },
    metadata: {
      comparisonProducts: comparisonProducts,
      affiliateLink: extractAffiliateLink($)
    }
  };
}

/**
 * Extract product name from h1
 * Wirecutter uses h1.review-title or just h1
 */
function extractProductName($) {
  // Try specific selector first
  let name = $("h1.review-title").first().text().trim();

  if (!name) {
    name = $("h1").first().text().trim();
  }

  if (!name) {
    // Fallback: look for name in meta tags
    name = $('meta[property="og:title"]').attr("content") || "";
  }

  // Clean up
  name = name.replace(/\s+/g, " ").trim();

  return name || null;
}

/**
 * Extract category from breadcrumb
 */
function extractCategory($) {
  // Breadcrumb structure: Home > Electronics > Category > Product
  const breadcrumb = $(".breadcrumb, .breadcrumbs, '[class*=\"breadcrumb\"]'").first().text();

  if (breadcrumb) {
    const parts = breadcrumb.split(/>/).map(s => s.trim());
    // Category is usually second-to-last
    if (parts.length >= 2) {
      return parts[parts.length - 2] || parts[0];
    }
    return parts[0];
  }

  // Fallback: look for category in class or data attributes
  const categoryEl = $("[class*='category']").first();
  if (categoryEl.length) {
    return categoryEl.text().trim();
  }

  return null;
}

/**
 * Extract subcategory
 */
function extractSubcategory($) {
  const breadcrumb = $(".breadcrumb, .breadcrumbs").first().text();

  if (breadcrumb) {
    const parts = breadcrumb.split(/>/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return parts[parts.length - 2];
    }
  }

  return null;
}

/**
 * Extract rating (out of 5)
 * Wirecutter uses a specific rating widget
 */
function extractRating($) {
  // Try numeric rating first (e.g., "4.5")
  let ratingText = $(".rating-value, [class*='rating-value']").first().text().trim();

  if (!ratingText) {
    // Try aria-label
    ratingText = $("[aria-label*='out of']").attr("aria-label") || "";
  }

  if (!ratingText) {
    // Try data attribute
    ratingText = $("[data-rating]").attr("data-rating") || "";
  }

  // Extract numeric value
  const match = ratingText.match(/(\d+\.?\d*)/);
  if (match) {
    return parseFloat(match[1]);
  }

  return null;
}

/**
 * Extract price
 * Wirecutter shows price in a specific element
 */
function extractPrice($) {
  let priceText = $(".product-price, [class*='price'], .price").first().text().trim();

  if (!priceText) {
    priceText = $("[data-price]").attr("data-price") || "";
  }

  // Extract numeric value
  const match = priceText.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ""));
  }

  return null;
}

/**
 * Extract pros list
 */
function extractPros($) {
  const pros = [];

  // Try pros container
  $(".pros-list, [class*='pros'], .pros-container").first().find("li, span").each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2 && text.length < 200) {
      pros.push(text);
    }
  });

  // Fallback: look for + indicators
  if (pros.length === 0) {
    $("*:contains('+')").each((i, el) => {
      const text = $(el).text().trim();
      if (text.startsWith("+") || text.includes("✓") || text.includes("✔")) {
        const cleaned = text.replace(/^[+\s]+/, "").trim();
        if (cleaned.length > 2 && cleaned.length < 100) {
          pros.push(cleaned);
        }
      }
    });
  }

  return pros;
}

/**
 * Extract cons list
 */
function extractCons($) {
  const cons = [];

  $(".cons-list, [class*='cons'], .cons-container").first().find("li, span").each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2 && text.length < 200) {
      cons.push(text);
    }
  });

  return cons;
}

/**
 * Extract verdict/recommendation text
 */
function extractVerdict($) {
  let verdict = $(".verdict, [class*='verdict'], .recommendation").first().text().trim();

  if (!verdict) {
    // Look for the main recommendation paragraph
    verdict = $(".entry-content p").first().text().trim();
  }

  if (!verdict) {
    // Look for "our pick" type text
    verdict = $("[class*='pick'], [class*='recommend']").first().text().trim();
  }

  return verdict || null;
}

/**
 * Extract author name
 */
function extractAuthor($) {
  let author = $(".author-name, [class*='author'], .byline").first().text().trim();

  if (!author) {
    author = $('meta[name="author"]').attr("content") || "";
  }

  // Clean up
  author = author.replace(/^by\s+/i, "").trim();

  return author || null;
}

/**
 * Extract published and last updated dates
 */
function extractDates($, page) {
  let publishedDate = null;
  let lastUpdated = null;

  // Published date
  const publishedEl = $(".published-date, [class*='published'], time[datetime]").first();
  if (publishedEl.length) {
    publishedDate = publishedEl.attr("datetime") ||
                    publishedEl.text().trim();
  }

  // Last updated
  const updatedEl = $(".last-updated, .updated-date, [class*='updated']").first();
  if (updatedEl.length) {
    lastUpdated = updatedEl.attr("datetime") ||
                   updatedEl.text().trim();
  }

  // Fallback: look for date in meta
  if (!publishedDate) {
    publishedDate = $('meta[property="article:published_time"]').attr("content") || null;
  }

  return { publishedDate, lastUpdated };
}

/**
 * Extract list of products compared in this review
 */
function extractComparisonProducts($) {
  const products = [];

  // Look for comparison table or mentioned products
  $(".comparison-table, [class*='compare'], .compared-products").first().find("tr, li").each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2 && text.length < 100) {
      products.push(text);
    }
  });

  return products;
}

/**
 * Extract affiliate link (useful for reference, not for redistribution)
 */
function extractAffiliateLink($) {
  // Note: We don't redistribute affiliate links, just note their presence
  const affiliateEl = $("a[href*='shareasale'], a[href*='avantlink'], a[href*=' VigLink").first();
  if (affiliateEl.length) {
    return affiliateEl.attr("href") ? "affiliate link present" : null;
  }
  return null;
}

module.exports = { extractReviewData };
