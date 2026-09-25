#!/usr/bin/env node

/**
 * Documentation MCP Server
 * 
 * Provides centralized access to development documentation, standards, and guidelines.
 * Keeps documentation secure and centralized - no need to share files with all developers.
 * 
 * Features:
 * - List all available documentation
 * - Search documentation by keywords
 * - Get specific documentation by topic/name
 * - Get table of contents/index
 * - Support for markdown files with metadata
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DOCS_BASE_PATH = process.env.DOCS_BASE_PATH || path.join(__dirname, 'content');
const DOCS_INDEX_FILE = process.env.DOCS_INDEX_FILE || 'index.json';
const DOCS_ACCESS_KEY = process.env.DOCS_ACCESS_KEY || null; // Optional: Set to require access key

/**
 * Documentation Service - Handles all documentation operations
 */
class DocumentationService {
  constructor() {
    this.docsBasePath = DOCS_BASE_PATH;
    this.indexFile = DOCS_INDEX_FILE;
    this.cache = new Map();
    this.lastIndexLoad = null;
  }

  /**
   * Load documentation index
   */
  loadIndex() {
    try {
      const indexPath = path.join(this.docsBasePath, this.indexFile);
      if (!fs.existsSync(indexPath)) {
        return this.scanForDocs();
      }
      
      const stats = fs.statSync(indexPath);
      // Reload if file changed or cache is empty
      if (!this.lastIndexLoad || stats.mtime > this.lastIndexLoad) {
        const content = fs.readFileSync(indexPath, 'utf-8');
        const index = JSON.parse(content);
        this.cache.set('index', index);
        this.lastIndexLoad = stats.mtime;
        return index;
      }
      
      return this.cache.get('index') || {};
    } catch (error) {
      console.error(`Error loading index: ${error.message}`);
      return this.scanForDocs();
    }
  }

  /**
   * Scan directory for markdown files and build index
   */
  scanForDocs() {
    const index = {
      categories: {},
      documents: [],
      metadata: {
        lastScan: new Date().toISOString(),
        totalDocuments: 0
      }
    };

    if (!fs.existsSync(this.docsBasePath)) {
      return index;
    }

    try {
      const files = fs.readdirSync(this.docsBasePath, { recursive: true, withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.md')) {
          const fullPath = path.join(file.path || this.docsBasePath, file.name);
          const relativePath = path.relative(this.docsBasePath, fullPath);
          const docInfo = this.parseDocument(fullPath, relativePath);
          
          if (docInfo) {
            index.documents.push(docInfo);
            
            // Organize by category
            const category = docInfo.category || 'general';
            if (!index.categories[category]) {
              index.categories[category] = [];
            }
            index.categories[category].push(docInfo.id);
          }
        }
      }

      index.metadata.totalDocuments = index.documents.length;
      this.cache.set('index', index);
      return index;
    } catch (error) {
      console.error(`Error scanning docs: ${error.message}`);
      return index;
    }
  }

  /**
   * Parse markdown document and extract metadata
   */
  parseDocument(filePath, relativePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const id = path.basename(relativePath, '.md').toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      // Extract frontmatter if present
      let metadata = {};
      let body = content;
      
      if (content.startsWith('---')) {
        const parts = content.split('---');
        if (parts.length >= 3) {
          try {
            metadata = JSON.parse(parts[1]);
            body = parts.slice(2).join('---');
          } catch (e) {
            // If not JSON, try YAML-like parsing
            const lines = parts[1].split('\n');
            for (const line of lines) {
              const match = line.match(/^(\w+):\s*(.+)$/);
              if (match) {
                metadata[match[1]] = match[2].trim();
              }
            }
            body = parts.slice(2).join('---');
          }
        }
      }

      // Extract title from first H1 or filename
      const titleMatch = body.match(/^#\s+(.+)$/m);
      const title = metadata.title || titleMatch?.[1] || path.basename(relativePath, '.md');

      return {
        id,
        title,
        path: relativePath,
        fullPath: filePath,
        category: metadata.category || 'general',
        tags: metadata.tags ? (Array.isArray(metadata.tags) ? metadata.tags : metadata.tags.split(',')) : [],
        description: metadata.description || this.extractDescription(body),
        keywords: metadata.keywords ? (Array.isArray(metadata.keywords) ? metadata.keywords : metadata.keywords.split(',')) : [],
        author: metadata.author || null,
        version: metadata.version || '1.0',
        lastUpdated: metadata.lastUpdated || this.getFileModTime(filePath),
        ...metadata
      };
    } catch (error) {
      console.error(`Error parsing document ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract description from first paragraph
   */
  extractDescription(content) {
    // Remove markdown headers
    const lines = content.split('\n').filter(line => !line.trim().startsWith('#'));
    // Get first non-empty paragraph
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 20) {
        return trimmed.substring(0, 200);
      }
    }
    return 'No description available';
  }

  /**
   * Get file modification time
   */
  getFileModTime(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.mtime.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * List all documents
   */
  listDocuments(category = null) {
    const index = this.loadIndex();
    
    if (category) {
      const categoryDocs = index.categories[category] || [];
      return index.documents.filter(doc => categoryDocs.includes(doc.id));
    }
    
    return index.documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      description: doc.description,
      tags: doc.tags
    }));
  }

  /**
   * Search documents
   */
  searchDocuments(query, category = null) {
    const index = this.loadIndex();
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    let docs = index.documents;
    
    // Filter by category if specified
    if (category) {
      const categoryDocs = index.categories[category] || [];
      docs = docs.filter(doc => categoryDocs.includes(doc.id));
    }
    
    // Search in title, description, keywords, tags, and content
    const results = docs.map(doc => {
      let score = 0;
      const searchText = `${doc.title} ${doc.description} ${doc.tags.join(' ')} ${doc.keywords.join(' ')}`.toLowerCase();
      const content = this.getDocumentContent(doc.fullPath).toLowerCase();
      
      for (const term of searchTerms) {
        if (doc.title.toLowerCase().includes(term)) score += 10;
        if (doc.description.toLowerCase().includes(term)) score += 5;
        if (doc.tags.some(tag => tag.toLowerCase().includes(term))) score += 3;
        if (doc.keywords.some(kw => kw.toLowerCase().includes(term))) score += 3;
        if (content.includes(term)) score += 1;
      }
      
      return { doc, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(result => ({
      id: result.doc.id,
      title: result.doc.title,
      category: result.doc.category,
      description: result.doc.description,
      score: result.score,
      tags: result.doc.tags
    }));
    
    return results;
  }

  /**
   * Get specific document
   */
  getDocument(documentId) {
    const index = this.loadIndex();
    const doc = index.documents.find(d => d.id === documentId);
    
    if (!doc) {
      return null;
    }
    
    const content = this.getDocumentContent(doc.fullPath);
    
    return {
      ...doc,
      content,
      length: content.length
    };
  }

  /**
   * Get document content
   */
  getDocumentContent(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      return `Error reading document: ${error.message}`;
    }
  }

  /**
   * Get table of contents
   */
  getTableOfContents() {
    const index = this.loadIndex();
    
    return {
      categories: Object.keys(index.categories).map(category => ({
        name: category,
        documentCount: index.categories[category].length,
        documents: index.categories[category].map(id => {
          const doc = index.documents.find(d => d.id === id);
          return doc ? {
            id: doc.id,
            title: doc.title,
            description: doc.description
          } : null;
        }).filter(Boolean)
      })),
      totalDocuments: index.metadata.totalDocuments,
      lastUpdated: index.metadata.lastScan
    };
  }

  /**
   * Get categories list
   */
  getCategories() {
    const index = this.loadIndex();
    return Object.keys(index.categories).map(category => ({
      name: category,
      count: index.categories[category].length
    }));
  }

  /**
   * Validate access key if configured
   */
  validateAccess(accessKey) {
    if (!DOCS_ACCESS_KEY) {
      return true; // No access control
    }
    return accessKey === DOCS_ACCESS_KEY;
  }
}

// Initialize documentation service
const docService = new DocumentationService();

// Create MCP server
const server = new Server(
  {
    name: 'documentation-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Set request handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_docs',
        description: 'List all available documentation. Optionally filter by category.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Optional category to filter documents (e.g., "standards", "guidelines", "best-practices")',
            },
            accessKey: {
              type: 'string',
              description: 'Optional access key if authentication is enabled',
            },
          },
        },
      },
      {
        name: 'search_docs',
        description: 'Search documentation by keywords. Returns ranked results.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (keywords separated by spaces)',
            },
            category: {
              type: 'string',
              description: 'Optional category to limit search scope',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
              default: 20,
            },
            accessKey: {
              type: 'string',
              description: 'Optional access key if authentication is enabled',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_doc',
        description: 'Get full content of a specific document by ID or title.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'Document ID (filename without .md extension)',
            },
            accessKey: {
              type: 'string',
              description: 'Optional access key if authentication is enabled',
            },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'get_index',
        description: 'Get table of contents/index of all documentation organized by category.',
        inputSchema: {
          type: 'object',
          properties: {
            accessKey: {
              type: 'string',
              description: 'Optional access key if authentication is enabled',
            },
          },
        },
      },
      {
        name: 'get_categories',
        description: 'Get list of all available categories and document counts.',
        inputSchema: {
          type: 'object',
          properties: {
            accessKey: {
              type: 'string',
              description: 'Optional access key if authentication is enabled',
            },
          },
        },
      },
    ],
  };
});

// Set request handler for tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Validate access if configured
  if (args.accessKey && !docService.validateAccess(args.accessKey)) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Invalid access key. Access denied.',
        },
      ],
      isError: true,
    };
  }

  try {
    switch (name) {
      case 'list_docs': {
        const docs = docService.listDocuments(args.category);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                total: docs.length,
                documents: docs,
              }, null, 2),
            },
          ],
        };
      }

      case 'search_docs': {
        const results = docService.searchDocuments(args.query, args.category);
        const limited = results.slice(0, args.limit || 20);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query: args.query,
                totalResults: results.length,
                results: limited,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_doc': {
        const doc = docService.getDocument(args.documentId);
        if (!doc) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Document "${args.documentId}" not found. Use list_docs to see available documents.`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `# ${doc.title}\n\n**Category:** ${doc.category}\n**Tags:** ${doc.tags.join(', ')}\n**Last Updated:** ${doc.lastUpdated}\n\n---\n\n${doc.content}`,
            },
          ],
        };
      }

      case 'get_index': {
        const toc = docService.getTableOfContents();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(toc, null, 2),
            },
          ],
        };
      }

      case 'get_categories': {
        const categories = docService.getCategories();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                categories,
                totalCategories: categories.length,
              }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Error: Unknown tool "${name}"`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Documentation MCP Server started');
}

main().catch(console.error);
































