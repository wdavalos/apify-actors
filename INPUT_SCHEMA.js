const INPUT_SCHEMA = {
  schema: {
    type: "object",
    properties: {
      mode: {
        type: "string",
        enum: ["single", "category", "full"],
        title: "Mode",
        description: "What to scrape: single URL, category, or full catalog",
        default: "single"
      },
      url: {
        type: "string",
        title: "Review URL",
        description: "Wirecutter review URL (required for mode: single)",
        example: "https://nytimes.com/wirecutter/reviews/sony-wh-1000xm5/"
      },
      category: {
        type: "string",
        enum: ["electronics", "home", "kitchen", "outdoor", "health", "families", "money"],
        title: "Category",
        description: "Wirecutter category to scrape (required for mode: category)",
        example: "electronics"
      },
      minRating: {
        type: "number",
        title: "Minimum Rating",
        description: "Only return products with rating >= this value (0-5)",
        minimum: 0,
        maximum: 5,
        example: 4.0
      },
      updatedAfter: {
        type: "string",
        title: "Updated After",
        description: "Only return reviews updated after this date (ISO format)",
        example: "2026-01-01"
      },
      proxyConfig: {
        type: "object",
        title: "Proxy Configuration",
        properties: {
          useApifyProxy: {
            type: "boolean",
            title: "Use Apify Proxy",
            description: "Use Apify residential proxies (recommended for NYT domain)",
            default: true
          },
          groups: {
            type: "array",
            title: "Proxy Groups",
            description: "Apify proxy groups to use",
            items: { type: "string" },
            default: ["RESIDENTIAL"]
          }
        },
        default: { useApifyProxy: true, groups: ["RESIDENTIAL"] }
      }
    },
    required: ["mode"]
  }
};

module.exports = INPUT_SCHEMA;
