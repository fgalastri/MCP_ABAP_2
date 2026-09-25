# Documentation MCP Server - Setup Guide

## Quick Start

### Step 1: Choose Your Documentation Location

You have two options:

**Option A: Local Directory (Recommended for Testing)**
- Keep documentation in `DOCS/content/` directory
- Simple setup, no network access needed

**Option B: Network Share (Recommended for Teams)**
- Store documentation on a network share or Git repository
- All developers access same location
- Centralized updates

### Step 2: Add to Cursor Configuration

Add the documentation server to your Cursor MCP configuration (`.cursor/mcp.json` or Cursor settings):

```json
{
  "mcpServers": {
    "documentation": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\DOCS\\server_docs.js"],
      "env": {
        "DOCS_BASE_PATH": "C:\\Users\\FabianoGalastri\\Cursor\\MCP\\DOCS\\content",
        "DOCS_ACCESS_KEY": null
      }
    }
  }
}
```

**For Network Share:**
```json
{
  "mcpServers": {
    "documentation": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\DOCS\\server_docs.js"],
      "env": {
        "DOCS_BASE_PATH": "\\\\server\\share\\documentation",
        "DOCS_ACCESS_KEY": "your-secret-key-here"
      }
    }
  }
}
```

**For Git Repository:**
```json
{
  "mcpServers": {
    "documentation": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\DOCS\\server_docs.js"],
      "env": {
        "DOCS_BASE_PATH": "C:\\dev\\documentation-repo\\docs",
        "DOCS_ACCESS_KEY": "your-secret-key-here"
      }
    }
  }
}
```

### Step 3: Create Your Documentation

1. **Organize by Categories:**

```
content/
├── standards/          # Coding standards, conventions
├── guidelines/         # Development guidelines
├── best-practices/     # Best practices and patterns
├── tools/              # Tool-specific documentation
└── general/            # General documentation
```

2. **Add Metadata to Documents:**

```markdown
---
title: "Your Document Title"
category: "standards"
tags: ["tag1", "tag2", "tag3"]
description: "Brief description of the document"
version: "1.0"
author: "Author Name"
lastUpdated: "2025-01-15"
---

# Your Document Title

Content here...
```

### Step 4: Test the Server

Restart Cursor and try:

```
List all documentation
Search for "coding standards"
Get document "example_coding_standards"
```

## Security Setup

### Option 1: No Access Control (Simple)
```json
"DOCS_ACCESS_KEY": null
```

### Option 2: Access Key (Recommended for Teams)
```json
"DOCS_ACCESS_KEY": "your-secret-key-here"
```

Then share the key securely with your team members.

## Deployment Options

### Option A: Local Development
- Each developer has local copy
- Updates via Git pull
- Simple but requires manual updates

### Option B: Network Share
- Centralized location
- Automatic updates for all
- Requires network access

### Option C: Git Repository
- Version controlled
- Easy updates via pull
- Can be private repo
- Best for distributed teams

## Recommended Structure

```
documentation-repo/
├── README.md
├── standards/
│   ├── coding-standards.md
│   ├── naming-conventions.md
│   └── code-review-checklist.md
├── guidelines/
│   ├── abap-development.md
│   ├── rap-development.md
│   ├── testing-standards.md
│   └── deployment-process.md
├── best-practices/
│   ├── security-guidelines.md
│   ├── performance-optimization.md
│   └── error-handling.md
├── tools/
│   ├── adt-workflow.md
│   └── mcp-usage.md
└── general/
    ├── getting-started.md
    ├── faq.md
    └── changelog.md
```

## Updating Documentation

1. **Edit files** in your documentation directory
2. **Add/update frontmatter** for metadata
3. **Commit to Git** (if using version control)
4. **Team members pull updates** (if using Git)
   - Or updates are automatically available (if using network share)

The server automatically rescans the directory when needed.

## Tips

1. **Use Descriptive Filenames**: `coding-standards.md` not `doc1.md`
2. **Add Tags**: Help with searchability
3. **Keep Categories Consistent**: Use same category names across documents
4. **Version Your Docs**: Track changes in frontmatter
5. **Regular Updates**: Keep documentation current

## Troubleshooting

**Server not starting:**
- Check Node.js is installed (v18+)
- Verify path to `server_docs.js` is correct
- Check documentation directory exists

**Documents not found:**
- Verify `DOCS_BASE_PATH` is correct
- Check file permissions
- Ensure files are `.md` format

**Search not working:**
- Check file encoding (UTF-8)
- Verify markdown syntax is valid

**Access denied:**
- Verify `DOCS_ACCESS_KEY` matches in config
- Check environment variables are set
































