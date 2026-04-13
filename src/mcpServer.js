/**
 * Wirecutter MCP Server
 *
 * Exposes Wirecutter review data via the Model Context Protocol.
 * AI agents can call these tools to get structured product review data.
 *
 * To use: Add to Claude Desktop, Cursor, or Windsurf MCP config:
 *
 * {
 *   "mcpServers": {
 *     "wirecutter": {
 *       "command": "node",
 *       "args": ["/path/to/wirecutter-actor/src/mcpServer.js"],
 *       "url": "https://YOUR-USERNAME--wirecutter-product-reviews.apify.actor/mcp"
 *     }
 *   }
 * }
 */

const { Server } = require("@modelcontextprotocol/sdk/server");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types");

// MCP Server implementation
const server = new Server(
  {
    name: "wirecutter-product-reviews",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Tool definitions
const TOOLS = [
  {
    name: "get_review",
    description: "Get structured product review data from Wirecutter by URL. Returns product name, category, rating, price, pros, cons, verdict, author, and last updated date. Best for: affiliate marketers tracking specific products, AI agents verifying Wirecutter picks.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Wirecutter review URL (e.g., https://nytimes.com/wirecutter/reviews/sony-wh-1000xm5/)"
        }
      },
      required: ["url"]
    }
  },
  {
    name: "get_category",
    description: "Get all product reviews in a Wirecutter category. Returns structured data for every product reviewed. Best for: affiliate marketers building niche sites, product researchers mapping the Wirecutter catalog.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["electronics", "home", "kitchen", "outdoor", "health", "families", "money"],
          description: "Wirecutter category name"
        },
        minRating: {
          type: "number",
          description: "Minimum rating filter (0-5). Default: no filter"
        }
      },
      required: ["category"]
    }
  },
  {
    name: "get_all_reviews",
    description: "Get all Wirecutter product reviews across every category. Full catalog dump. Best for: AI agents running market analysis, product research firms building comprehensive datasets, hedge funds modeling consumer product sentiment.",
    inputSchema: {
      type: "object",
      properties: {
        updatedAfter: {
          type: "string",
          description: "ISO date — only return reviews updated after this date. Default: no filter"
        },
        minRating: {
          type: "number",
          description: "Minimum rating filter (0-5). Default: no filter"
        }
      }
    }
  },
  {
    name: "get_categories",
    description: "List all available Wirecutter categories. Returns category names and URL paths. Use this first to discover what categories are available.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_review": {
        if (!args.url) {
          throw new Error("url parameter is required");
        }

        // Call Apify actor via API
        const response = await callApifyActor({
          mode: "single",
          url: args.url
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      case "get_category": {
        if (!args.category) {
          throw new Error("category parameter is required");
        }

        const response = await callApifyActor({
          mode: "category",
          category: args.category,
          minRating: args.minRating
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      case "get_all_reviews": {
        const response = await callApifyActor({
          mode: "full",
          minRating: args.minRating,
          updatedAfter: args.updatedAfter
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }

      case "get_categories": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                categories: [
                  { name: "electronics", displayName: "Electronics", path: "/wirecutter/category/electronics/" },
                  { name: "home", displayName: "Home", path: "/wirecutter/category/home/" },
                  { name: "kitchen", displayName: "Kitchen", path: "/wirecutter/category/kitchen/" },
                  { name: "outdoor", displayName: "Outdoor", path: "/wirecutter/category/outdoor/" },
                  { name: "health", displayName: "Health", path: "/wirecutter/category/health/" },
                  { name: "families", displayName: "Families", path: "/wirecutter/category/families/" },
                  { name: "money", displayName: "Money", path: "/wirecutter/category/money/" }
                ]
              }, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: error.message })
        }
      ],
      isError: true
    };
  }
});

/**
 * Call Apify actor via API
 */
async function callApifyActor(input) {
  const { Actor } = require("apify");

  // Get Apify token from environment
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error("APIFY_TOKEN environment variable not set");
  }

  // For direct actor calls (when running on Apify)
  // Use the Apify client
  const actorId = process.env.APIFY_ACTOR_ID || "YOUR-USERNAME/wirecutter-product-reviews";

  try {
    const actor = new Actor(actorId);
    const run = await actor.call(input);

    // Fetch dataset items
    const dataset = await actor.dataset();
    const items = await dataset.getData();

    return {
      status: "success",
      runId: run.id,
      items: items.items,
      count: items.count
    };
  } catch (error) {
    // Fallback: if running locally, describe what would happen
    if (error.message.includes("not authorized")) {
      return {
        status: "note",
        message: `Would call Apify actor with input: ${JSON.stringify(input)}`,
        note: "Configure APIFY_TOKEN to enable direct API calls"
      };
    }
    throw error;
  }
}

// Start server
async function main() {
  const port = parseInt(process.env.MCP_PORT || "3100");

  server.connect();

  console.log(`Wirecutter MCP Server running on port ${port}`);
  console.log(`Tools available: ${TOOLS.map(t => t.name).join(", ")}`);
}

// Export for testing
module.exports = { server, TOOLS };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
