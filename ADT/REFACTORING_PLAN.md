# ADT Service Refactoring Plan - ON-PREMISE ONLY

## Method Categorization (36 total methods)

### 1. Base Service (adt-service-base.js) - 2 methods
Core authentication and session management:
- `initialize()`
- `getCsrfToken()`
+ Constructor, client setup, helpers (buildObjectUri, buildSourceUri, mapToAbapDdlType)

### 2. Create Operations (adt-service-create.js) - 13 methods
Object creation operations:
- `createClass()`
- `createTable()`
- `createInterface()`
- `createProgram()`
- `createCdsView()`
- `createDataElement()`
- `createDomain()`
- `createTableType()`
- `createStructure()`
- `createServiceDefinition()`
- `createServiceBinding()`
- `createBehaviorDefinition()`
- `createMetadataExtension()`

### 3. Read Operations (adt-service-read.js) - 5 methods
Reading source code and metadata:
- `readSource()`
- `readServiceBinding()`
- `readTestClassInclude()`
- `readLocalImplementations()`
- `discoverFunctionGroup()`

### 4. Write Operations (adt-service-write.js) - 5 methods
Saving and locking:
- `lockObject()`
- `saveSource()`
- `saveTestClassInclude()`
- `saveLocalImplementations()`
- `unlockObject()`

### 5. Activation Operations (adt-service-activate.js) - 4 methods
Syntax checking and activation:
- `checkSyntax()`
- `checkSyntaxUnsaved()`
- `activateObjects()`
- `updateAndActivate()`

### 6. Test/Execute Operations (adt-service-test.js) - 2 methods
Testing and execution:
- `runUnitTests()`
- `executeClass()`

### 7. Generator Operations (adt-service-generators.js) - 2 methods
RAP and query generators:
- `generateRapUiService()`
- `generateCustomQuery()`

### 8. Transport Operations (adt-service-transport.js) - 3 methods
Transport and package management:
- `removeObjectsFromTransport()`
- `reassignPackage()`
- `whereUsedList()`

## Extraction Strategy

**Phase 1: Base Service** ✅ CURRENT
- Extract constructor, initialize, getCsrfToken
- Extract helper methods (buildObjectUri, buildSourceUri, mapToAbapDdlType)
- Keep axios client and shared state

**Phase 2: Read Operations** (Safest - no modifications)
- Extract all read methods
- These are the safest as they don't modify anything

**Phase 3: Create Operations**
- Extract all create methods

**Phase 4: Write Operations**
- Extract lock/save/unlock methods

**Phase 5: Activation Operations**
- Extract syntax check and activation

**Phase 6: Remaining Operations**
- Test/Execute, Generators, Transport

**Phase 7: Integration**
- Update server_adt.js to use all modules
- Test each operation

## Testing Checkpoints

After each phase:
1. ✅ Run `node --check` on all files
2. ✅ Test MCP connection with simple operation
3. ✅ If anything fails → rollback from .backup






