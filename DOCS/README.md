# Documentation MCP Server

Centralized documentation server for development standards, guidelines, and best practices.

## Features

- ✅ **Centralized Storage**: All documentation in one secure location
- ✅ **No File Sharing**: Developers access docs via MCP, no file distribution needed
- ✅ **Easy Updates**: Update docs once, all developers get latest version
- ✅ **Search & Discovery**: Full-text search across all documentation
- ✅ **Security**: Optional access key protection
- ✅ **Categorized**: Organize docs by categories (standards, guidelines, etc.)

## Setup

### 1. Install Dependencies

```bash
cd DOCS
npm install
```

### 2. Create Documentation Structure

Create your documentation files in the `content` directory:

```
DOCS/
├── server_docs.js
├── package.json
└── content/
    ├── index.json (optional - auto-generated if missing)
    ├── standards/
    │   ├── coding-standards.md
    │   └── naming-conventions.md
    ├── guidelines/
    │   ├── abap-development.md
    │   └── rap-best-practices.md
    └── general/
        └── getting-started.md
```

### 3. Document Format

Documents are Markdown files with optional frontmatter:

```markdown
---
title: "Coding Standards"
category: "standards"
tags: ["abap", "coding", "standards"]
description: "Our team coding standards and conventions"
version: "2.1"
author: "Development Team"
lastUpdated: "2025-01-15"
---

# Coding Standards

Content here...
```

### 4. Configure Cursor MCP

Add to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "documentation": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\DOCS\\server_docs.js"],
      "env": {
        "DOCS_BASE_PATH": "C:\\path\\to\\your\\docs\\content",
        "DOCS_ACCESS_KEY": "optional-secret-key"
      }
  }
}
```

## Environment Variables

- `DOCS_BASE_PATH`: Path to documentation directory (default: `./content`)
- `DOCS_INDEX_FILE`: Index filename (default: `index.json`)
- `DOCS_ACCESS_KEY`: Optional access key for security (set to null to disable)

## Available Tools

### `list_docs`
List all available documentation, optionally filtered by category.

**Parameters:**
- `category` (optional): Filter by category name
- `accessKey` (optional): Access key if authentication enabled

**Example:**
```json
{
  "tool": "list_docs",
  "arguments": {
    "category": "standards"
  }
}
```

### `search_docs`
Search documentation by keywords. Returns ranked results.

**Parameters:**
- `query` (required): Search query
- `category` (optional): Limit search to category
- `limit` (optional): Max results (default: 20)
- `accessKey` (optional): Access key if authentication enabled

**Example:**
```json
{
  "tool": "search_docs",
  "arguments": {
    "query": "rap best practices",
    "category": "guidelines",
    "limit": 10
  }
}
```

### `get_doc`
Get full content of a specific document.

**Parameters:**
- `documentId` (required): Document ID (filename without .md)
- `accessKey` (optional): Access key if authentication enabled

**Example:**
```json
{
  "tool": "get_doc",
  "arguments": {
    "documentId": "coding_standards"
  }
}
```

### `get_index`
Get table of contents/index organized by category.

**Parameters:**
- `accessKey` (optional): Access key if authentication enabled

### `get_categories`
Get list of all categories with document counts.

**Parameters:**
- `accessKey` (optional): Access key if authentication enabled

## Security Considerations

1. **Access Control**: Set `DOCS_ACCESS_KEY` environment variable to require authentication
2. **File Permissions**: Ensure documentation directory has appropriate permissions
3. **Network Security**: If hosting on network share, ensure secure access
4. **Version Control**: Keep documentation in version control (private repo)

## Best Practices

1. **Organize by Category**: Use categories like `standards`, `guidelines`, `best-practices`
2. **Add Metadata**: Include frontmatter with title, description, tags
3. **Regular Updates**: Keep documentation current
4. **Clear Titles**: Use descriptive filenames and titles
5. **Versioning**: Track versions in frontmatter

## Example Documentation Structure

```
content/
├── standards/
│   ├── coding-standards.md
│   ├── naming-conventions.md
│   └── code-review-checklist.md
├── guidelines/
│   ├── abap-development.md
│   ├── rap-development.md
│   └── testing-standards.md
├── best-practices/
│   ├── security-guidelines.md
│   └── performance-optimization.md
└── general/
    ├── getting-started.md
    └── faq.md
```

## Troubleshooting

**Documentation not found:**
- Check `DOCS_BASE_PATH` is correct
- Verify files exist in content directory
- Check file permissions

**Search not working:**
- Ensure documents are in `.md` format
- Check file encoding (UTF-8)

**Access denied:**
- Verify `DOCS_ACCESS_KEY` matches in config
- Check environment variables are set correctly
































