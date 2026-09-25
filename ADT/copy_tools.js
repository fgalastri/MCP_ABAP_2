import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the original server
const originalContent = fs.readFileSync(path.join(__dirname, 'server_adt.js'), 'utf8');

// Extract the tools list (between "tools: [" and the closing "]")
const toolsStart = originalContent.indexOf('server.setRequestHandler(ListToolsRequestSchema');
const toolsEnd = originalContent.indexOf('});', toolsStart) + 3;
const toolsSection = originalContent.substring(toolsStart, toolsEnd);

// Extract the switch cases (between "switch (name) {" and the end of the handler)
const switchStart = originalContent.indexOf('switch (name) {', toolsEnd);
const switchEnd = originalContent.indexOf('server.setRequestHandler(ListResourcesRequestSchema', switchStart);
const switchSection = originalContent.substring(switchStart, switchEnd);

// Replace all 'adt_' with 'thin_v2_' in both sections
const modifiedTools = toolsSection.replace(/['"]adt_/g, "'thin_v2_");
const modifiedSwitch = switchSection.replace(/case 'adt_/g, "case 'thin_v2_");

// Write the output
const output = `
// ============================================================
// TOOLS LIST (Renamed from adt_* to thin_v2_*)
// ============================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
${modifiedTools.split('\n').slice(2, -2).join('\n')}
  };
});

// ============================================================
// TOOL HANDLERS (Renamed from adt_* to thin_v2_*)
// ============================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

${modifiedSwitch.split('\n').slice(1).join('\n')}
`;

fs.writeFileSync(path.join(__dirname, 'tools_output.txt'), output, 'utf8');
console.log('✅ Tools and handlers extracted and renamed!');
console.log('📄 Output written to: tools_output.txt');
