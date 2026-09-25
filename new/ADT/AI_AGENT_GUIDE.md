# Building an AI Agent for Eclipse - Complete Guide

## 🎯 Goal

Create a **Cursor-like AI agent** in Eclipse that can:
- ✅ Read ABAP objects from SAP system (via ADT)
- ✅ Write/update ABAP objects
- ✅ Check syntax and activate objects
- ✅ Understand natural language queries
- ✅ Execute complex ABAP operations
- ✅ Provide intelligent code assistance

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      User Interface                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  AgentChatView                                         │  │
│  │  - Chat history (like Cursor's chat)                   │  │
│  │  - Input field for queries                             │  │
│  │  - Send button                                         │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    Agent Service                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  1. Collect Context (AgentContextCollector)            │  │
│  │     - Current file, selection, project                 │  │
│  │                                                         │  │
│  │  2. Call LLM with Tools                                │  │
│  │     - Claude API / OpenAI API                          │  │
│  │     - Tool/function calling enabled                    │  │
│  │                                                         │  │
│  │  3. Execute Tools                                      │  │
│  │     - Read/write ABAP via ADT                          │  │
│  │     - Syntax check, activation                         │  │
│  │     - Validate via MCP                                 │  │
│  │                                                         │  │
│  │  4. Stream Response                                    │  │
│  │     - Return results to chat view                      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                ↓                              ↓
┌──────────────────────────┐  ┌──────────────────────────────┐
│    ADT Service            │  │    MCP Client                │
│  - Read ABAP objects      │  │  - Validate via MCP server   │
│  - Write ABAP objects     │  │  - Execute methods           │
│  - Check syntax           │  │  - Generate code             │
│  - Activate objects       │  │                              │
└──────────────────────────┘  └──────────────────────────────┘
         ↓                                  ↓
┌──────────────────────────┐  ┌──────────────────────────────┐
│    SAP System (ADT)       │  │    MCP Server (Node.js)      │
│  - ABAP repository        │  │  - ABAP validator            │
│  - RFC/HTTP               │  │  - Code generator            │
└──────────────────────────┘  └──────────────────────────────┘
```

---

## 📦 Components (Already Created)

### ✅ 1. AgentChatView
**File**: `AgentChatView.java`

**What it does**:
- Provides chat interface (like Cursor)
- Displays conversation history
- Handles user input
- Shows AI responses

**Status**: ✅ UI complete, needs AI integration

### ✅ 2. AgentContextCollector
**File**: `AgentContextCollector.java`

**What it does**:
- Collects current file, project info
- Gets selected text and cursor position
- Determines if ABAP project
- Provides context to AI

**Status**: ✅ Complete

### ✅ 3. AdtService
**File**: `AdtService.java`

**What it does**:
- Read ABAP objects from SAP
- Write/update ABAP objects
- Check syntax
- Activate objects
- Create new objects

**Status**: 🔧 Skeleton ready, needs ADT API integration

### ✅ 4. AgentService
**File**: `AgentService.java`

**What it does**:
- Coordinates between UI, ADT, and AI
- Calls LLM with tool definitions
- Executes tool calls
- Returns results

**Status**: 🔧 Structure complete, needs LLM integration

---

## 🔑 Key Difference: ABAP Files vs Regular Files

### **Regular Files (Git-based)**
```java
// Easy - just read from disk
IFile file = ...;
InputStream stream = file.getContents();
String content = IOUtils.toString(stream);
```

### **ABAP Files (ADT-based)**
```java
// Complex - must go through ADT APIs
// Files are NOT on disk - they're in SAP system!

// 1. Get ABAP project
IProject project = file.getProject();

// 2. Get ADT destination (SAP connection)
IDestination destination = DestinationRegistry.getDestination(project);

// 3. Build object URI
String uri = "/sap/bc/adt/oo/classes/ZCL_MY_CLASS/source/main";

// 4. Use ADT communication controller
IAdtObjectContentService service = destination.getContentService();
IAdtObjectContent content = service.read(uri, ...);

// 5. Get source code
String sourceCode = new String(content.getContent(), StandardCharsets.UTF_8);
```

**This is why ADT integration is critical!**

---

## 🚀 Implementation Steps

### **Phase 1: ADT Integration** (CRITICAL)

**Goal**: Make `AdtService.java` actually work

#### Step 1.1: Add ADT Dependencies

Update `MANIFEST.MF`:

```
Require-Bundle: org.eclipse.core.runtime;bundle-version="3.29.0",
 org.eclipse.ui;bundle-version="3.201.0",
 com.sap.adt.tools.core;bundle-version="3.0.0",
 com.sap.adt.communication;bundle-version="3.0.0",
 com.sap.adt.destinations;bundle-version="3.0.0",
 com.sap.adt.project;bundle-version="3.0.0",
 com.sap.adt.ris.model;bundle-version="3.0.0"
```

**Important**: You need ADT installed in your Eclipse!

#### Step 1.2: Implement Real ADT Methods

Replace the placeholder code in `AdtService.java`:

```java
import com.sap.adt.communication.content.AdtMediaType;
import com.sap.adt.communication.content.IAdtObjectContent;
import com.sap.adt.communication.resources.AdtRestResourceFactory;
import com.sap.adt.communication.resources.IRestResource;
import com.sap.adt.destinations.model.IDestinationData;
import com.sap.adt.destinations.model.IDestinationDataProvider;
import com.sap.adt.project.IAbapProject;
import com.sap.adt.project.AbapProjectManager;

public String readAbapObject(IProject project, String objectName, String objectType) 
        throws Exception {
    
    // Get ABAP project
    IAbapProject abapProject = AbapProjectManager.getAbapProject(project);
    if (abapProject == null) {
        throw new Exception("Not an ABAP project");
    }
    
    // Get destination (SAP connection)
    IDestinationData destination = abapProject.getDestinationData();
    
    // Build URI based on object type
    String uri = buildObjectUri(objectName, objectType);
    
    // Create REST resource
    IRestResource resource = AdtRestResourceFactory.createRestResourceFactory()
        .createResourceWithStatelessSession(uri, destination);
    
    // Read content
    resource.addContentHandler(new AdtMediaType("text/plain"));
    IAdtObjectContent content = resource.get(null, IAdtObjectContent.class);
    
    // Return source code
    return new String(content.getContent(), StandardCharsets.UTF_8);
}

private String buildObjectUri(String objectName, String objectType) {
    switch (objectType.toUpperCase()) {
        case "CLAS":
            return "/sap/bc/adt/oo/classes/" + objectName.toLowerCase() + "/source/main";
        case "INTF":
            return "/sap/bc/adt/oo/interfaces/" + objectName.toLowerCase() + "/source/main";
        case "DDLS":
            return "/sap/bc/adt/ddic/ddl/sources/" + objectName.toLowerCase();
        case "TABL":
            return "/sap/bc/adt/ddic/tables/" + objectName.toLowerCase();
        default:
            throw new IllegalArgumentException("Unsupported object type: " + objectType);
    }
}
```

#### Step 1.3: Test ADT Integration

```java
// Test reading a class
AdtService adtService = new AdtService();
IProject project = ...; // Your ABAP project
String source = adtService.readAbapObject(project, "ZCL_TEST", "CLAS");
System.out.println(source);
```

---

### **Phase 2: LLM Integration**

**Goal**: Connect to Claude or OpenAI API

#### Option A: Claude API (Recommended)

**Why Claude?**
- Best at code understanding
- Excellent tool/function calling
- 200K context window
- Streaming support

**Implementation**:

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

public class ClaudeClient {
    private String apiKey;
    private HttpClient httpClient;
    
    public ClaudeClient(String apiKey) {
        this.apiKey = apiKey;
        this.httpClient = HttpClient.newHttpClient();
    }
    
    public void sendMessage(
            String systemPrompt,
            String userMessage,
            JsonArray tools,
            ResponseCallback callback) throws Exception {
        
        // Build request body
        JsonObject request = new JsonObject();
        request.addProperty("model", "claude-3-5-sonnet-20241022");
        request.addProperty("max_tokens", 4096);
        request.addProperty("system", systemPrompt);
        
        JsonArray messages = new JsonArray();
        JsonObject userMsg = new JsonObject();
        userMsg.addProperty("role", "user");
        userMsg.addProperty("content", userMessage);
        messages.add(userMsg);
        request.add("messages", messages);
        
        if (tools != null) {
            request.add("tools", tools);
        }
        
        // Create HTTP request
        HttpRequest httpRequest = HttpRequest.newBuilder()
            .uri(URI.create("https://api.anthropic.com/v1/messages"))
            .header("Content-Type", "application/json")
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .POST(HttpRequest.BodyPublishers.ofString(request.toString()))
            .build();
        
        // Send request
        HttpResponse<String> response = httpClient.send(
            httpRequest, 
            HttpResponse.BodyHandlers.ofString()
        );
        
        // Parse response
        JsonObject responseJson = gson.fromJson(response.body(), JsonObject.class);
        
        // Handle tool use
        JsonArray content = responseJson.getAsJsonArray("content");
        for (int i = 0; i < content.size(); i++) {
            JsonObject block = content.get(i).getAsJsonObject();
            String type = block.get("type").getAsString();
            
            if ("text".equals(type)) {
                callback.onResponse(block.get("text").getAsString());
            } else if ("tool_use".equals(type)) {
                // Handle tool call - see Phase 3
                String toolId = block.get("id").getAsString();
                String toolName = block.get("name").getAsString();
                JsonObject toolInput = block.getAsJsonObject("input");
                
                // Execute tool and continue conversation
                // (see next section)
            }
        }
        
        callback.onComplete();
    }
}
```

#### Option B: OpenAI API

```java
public class OpenAIClient {
    private String apiKey;
    
    public void sendMessage(
            String systemPrompt,
            String userMessage,
            JsonArray tools,
            ResponseCallback callback) throws Exception {
        
        // Similar to Claude, but with OpenAI format
        JsonObject request = new JsonObject();
        request.addProperty("model", "gpt-4-turbo-preview");
        request.addProperty("max_tokens", 4096);
        
        JsonArray messages = new JsonArray();
        // Add system message
        JsonObject sysMsg = new JsonObject();
        sysMsg.addProperty("role", "system");
        sysMsg.addProperty("content", systemPrompt);
        messages.add(sysMsg);
        
        // Add user message
        JsonObject userMsg = new JsonObject();
        userMsg.addProperty("role", "user");
        userMsg.addProperty("content", userMessage);
        messages.add(userMsg);
        
        request.add("messages", messages);
        
        if (tools != null) {
            request.add("functions", tools); // OpenAI uses "functions"
        }
        
        // Send to OpenAI API...
    }
}
```

#### Option C: Local LLM (Ollama)

```java
public class OllamaClient {
    private String baseUrl = "http://localhost:11434";
    
    public void sendMessage(String prompt, ResponseCallback callback) throws Exception {
        JsonObject request = new JsonObject();
        request.addProperty("model", "codellama");
        request.addProperty("prompt", prompt);
        request.addProperty("stream", true);
        
        // Send to Ollama...
    }
}
```

---

### **Phase 3: Tool Execution Loop**

**The magic happens here!** This is how the AI agent executes ABAP operations.

```java
public void processQueryWithTools(String userMessage, ResponseCallback callback) {
    AgentContext context = contextCollector.collectContext();
    String systemPrompt = buildSystemPrompt(context);
    JsonArray tools = buildToolsDefinition();
    
    List<JsonObject> conversationHistory = new ArrayList<>();
    conversationHistory.add(createUserMessage(userMessage));
    
    boolean continueConversation = true;
    int maxIterations = 5; // Prevent infinite loops
    int iteration = 0;
    
    while (continueConversation && iteration < maxIterations) {
        iteration++;
        
        // Call LLM
        ClaudeResponse response = claudeClient.sendMessage(
            systemPrompt, 
            conversationHistory, 
            tools
        );
        
        // Check if LLM wants to use tools
        if (response.hasToolUse()) {
            List<ToolResult> toolResults = new ArrayList<>();
            
            // Execute each tool call
            for (ToolUse toolUse : response.getToolUses()) {
                callback.onResponse("[Executing: " + toolUse.getName() + "]\n");
                
                ToolResult result = executeTool(
                    toolUse.getName(), 
                    toolUse.getInput(), 
                    context
                );
                
                toolResults.add(result);
                
                callback.onResponse("[Result: " + result.getContent() + "]\n\n");
            }
            
            // Add tool results to conversation
            conversationHistory.add(createToolResultsMessage(response, toolResults));
            
            // Continue conversation with tool results
            continueConversation = true;
        } else {
            // No more tools - return final response
            callback.onResponse(response.getText());
            callback.onComplete();
            continueConversation = false;
        }
    }
}
```

**Example Flow**:

```
User: "Check syntax of class ZCL_TEST"
  ↓
Agent thinks: "I need to use check_syntax tool"
  ↓
[Executing: check_syntax]
  ↓
Tool executes: adtService.checkSyntax(project, "ZCL_TEST", "CLAS")
  ↓
[Result: Syntax check passed, no errors]
  ↓
Agent responds: "✅ The syntax of ZCL_TEST is correct. No errors found."
```

---

## 🎯 Complete Example: Check Syntax and Activate

Here's a complete example showing how it all works together:

```java
// User query
String userQuery = "Check syntax of my current class and activate it if OK";

// Agent processes
agentService.processQuery(userQuery, new ResponseCallback() {
    @Override
    public void onResponse(String chunk) {
        // Display in chat view
        chatView.appendAgentResponse(chunk);
    }
    
    @Override
    public void onComplete() {
        // Done
    }
    
    @Override
    public void onError(Exception e) {
        chatView.appendAgentResponse("Error: " + e.getMessage());
    }
});

// Behind the scenes:
// 1. Context collected: current file = ZCL_MY_CLASS
// 2. LLM called with tools: check_syntax, activate_object
// 3. LLM decides to use check_syntax first
// 4. Tool executed: syntax check passes
// 5. LLM decides to use activate_object
// 6. Tool executed: activation succeeds
// 7. LLM responds: "✅ Syntax check passed. Object activated successfully."
```

---

## 📊 Implementation Roadmap

### Week 1: ADT Integration
- [ ] Add ADT dependencies
- [ ] Implement readAbapObject
- [ ] Implement writeAbapObject
- [ ] Implement checkSyntax
- [ ] Implement activateObject
- [ ] Test with real ABAP project

### Week 2: LLM Integration
- [ ] Choose LLM (Claude recommended)
- [ ] Implement API client
- [ ] Test basic queries
- [ ] Implement streaming
- [ ] Add error handling

### Week 3: Tool Execution
- [ ] Implement tool execution loop
- [ ] Add all tool handlers
- [ ] Test multi-step workflows
- [ ] Add progress indicators
- [ ] Handle edge cases

### Week 4: Polish & Features
- [ ] Improve UI (syntax highlighting)
- [ ] Add conversation history
- [ ] Implement context persistence
- [ ] Add keyboard shortcuts
- [ ] Write documentation

---

## 🔐 Security Considerations

### API Keys
```java
// Use Eclipse Secure Storage
ISecurePreferences securePrefs = SecurePreferencesFactory.getDefault();
ISecurePreferences node = securePrefs.node("com.sap.abap.mcp.agent");

// Store API key
node.put("claude_api_key", apiKey, true);

// Retrieve API key
String apiKey = node.get("claude_api_key", "");
```

### SAP Credentials
Already handled by ADT - uses existing SAP connection

---

## 💰 Cost Estimates

### Claude API (Pay per token)
- Input: $3 per million tokens
- Output: $15 per million tokens
- **Typical query**: $0.01 - $0.05
- **Heavy usage (100 queries/day)**: ~$150/month

### OpenAI GPT-4
- Input: $10 per million tokens
- Output: $30 per million tokens
- **More expensive** than Claude

### Local LLM (Ollama)
- **FREE** (but less capable)
- Runs on your machine
- No API costs

---

## 🎓 Next Steps

1. **Start with ADT Integration**
   - This is the foundation
   - Must work before AI can help

2. **Get Claude API Key**
   - Sign up at https://console.anthropic.com
   - Start with free tier

3. **Implement Basic Query**
   - User asks: "What's in my current file?"
   - Agent reads via ADT and responds

4. **Add Tool Execution**
   - Enable syntax check, activation, etc.

5. **Expand Capabilities**
   - Code generation
   - Refactoring suggestions
   - Documentation generation

---

## 📚 Resources

- **ADT API Docs**: Check SAP's ADT documentation
- **Claude API**: https://docs.anthropic.com/claude/reference/messages_post
- **OpenAI API**: https://platform.openai.com/docs/api-reference
- **Eclipse Secure Storage**: https://wiki.eclipse.org/Equinox/Security/Storage

---

## 🎉 What You'll Have

When complete, you'll have:
- ✅ Cursor-like AI agent in Eclipse
- ✅ Full ABAP integration (read/write/syntax/activate)
- ✅ Natural language queries
- ✅ Multi-step workflows
- ✅ Context-aware assistance
- ✅ Code generation capabilities

**Estimated Total Time**: 4-6 weeks for full implementation

**But**: You can have basic functionality (read + AI chat) in **1-2 weeks**!

---

Good luck! This is an ambitious but **definitely achievable** project! 🚀

