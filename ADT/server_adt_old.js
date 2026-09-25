#!/usr/bin/env node

/**
 * ABAP ADT MCP Server - Direct ADT REST API Integration
 * 
 * This MCP server uses Eclipse ADT (ABAP Development Tools) REST APIs
 * to interact with ABAP systems. Bypasses OData4 services for direct
 * repository access.
 * 
 * Based on reverse-engineered ADT APIs from Eclipse ADT Communication Log
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import our modular services
import { createLogger, getLogFilePath, parseAdtError } from './adt-utils.js';
import { loadConfig, validateConfig, loadBtpCookies } from './adt-config.js';
import { AdtServiceBase, xmlParser, xmlBuilder } from './adt-service-base.js';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create log file and logger
const SERVER_ID = '🏢 ON-PREM';
const logFile = path.join(__dirname, 'adt_debug.log');
const log = createLogger(SERVER_ID, logFile);

// Load and validate SAP configuration
const SAP_CONFIG = loadConfig(SERVER_ID);

try {
  validateConfig(SAP_CONFIG);
} catch (error) {
  console.error(`❌ ERROR: ${error.message}`);
  console.error('   Please check your MCP configuration in .cursor/mcp.json');
  process.exit(1);
}

// Helper function to load BTP cookies (wraps the imported function with config)
function loadBtpCookiesWrapper() {
  return loadBtpCookies(SAP_CONFIG.btpCookiesFile, log);
}

/**
 * ADT Service - Handles all ADT REST API operations
 * Extends AdtServiceBase for core authentication and session management
 */
class AdtService extends AdtServiceBase {
  constructor() {
    // Call parent constructor with config, log function, and cookie loader
    super(SAP_CONFIG, log, loadBtpCookiesWrapper);
  }

  /**
   * Create a new Table Type (with optional complete definition)
   * Endpoint: POST /sap/bc/adt/ddic/tabletypes?corrNr={transport}
   */
  async createTableType(tableTypeName, description, packageName, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        language = 'EN',
        masterLanguage = 'EN',
        responsible = SAP_CONFIG.username,
        lineType = null,
        tableCategory = 'STANDARD',  // STANDARD, SORTED, HASHED
        keyDefinition = null
      } = options;

      // Build XML request for table type creation
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?><ttyp:tableType xmlns:ttyp="http://www.sap.com/dictionary/tabletype" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${tableTypeName.toUpperCase()}" adtcore:type="TTYP/DA" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="S4H" adtcore:responsible="${responsible}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
</ttyp:tableType>`;

      const response = await this.client.post(
        `/sap/bc/adt/ddic/tabletypes?corrNr=${transportRequest}`,
        xmlRequest,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Accept': 'application/vnd.sap.adt.tabletype.v1+xml',
            'Content-Type': 'application/vnd.sap.adt.tabletype.v1+xml'
          }
        }
      );

      log(`[CREATE TABLE TYPE] Table type created: ${tableTypeName.toUpperCase()}`);

      // Step 2: If line type provided, complete the table type definition
      if (lineType) {
        log(`[CREATE TABLE TYPE] Completing table type definition with line type: ${lineType}`);
        
        // Lock the table type
        const lockResult = await this.lockObject(tableTypeName.toUpperCase(), 'TTYP');
        if (!lockResult.success) {
          throw new Error(`Failed to lock table type: ${lockResult.error}`);
        }
        
        const lockHandle = lockResult.lockHandle;
        
        try {
          // Map table category to access type
          const accessTypeMap = {
            'STANDARD': 'standard',
            'SORTED': 'sorted',
            'HASHED': 'hashed'
          };
          const accessType = accessTypeMap[tableCategory.toUpperCase()] || 'standard';
          
          // Build complete table type XML with content
          const completeXml = `<?xml version="1.0" encoding="UTF-8"?><ttyp:tableType xmlns:ttyp="http://www.sap.com/dictionary/tabletype" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${tableTypeName.toUpperCase()}" adtcore:type="TTYP/DA" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="S4H" adtcore:responsible="${responsible}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
  <ttyp:rowType>
    <ttyp:typeKind>dictionaryType</ttyp:typeKind>
    <ttyp:typeName>${lineType.toUpperCase()}</ttyp:typeName>
    <ttyp:builtInType>
      <ttyp:dataType/>
      <ttyp:length>0</ttyp:length>
      <ttyp:decimals>0</ttyp:decimals>
    </ttyp:builtInType>
    <ttyp:rangeType/>
  </ttyp:rowType>
  <ttyp:initialRowCount>0</ttyp:initialRowCount>
  <ttyp:accessType>${accessType}</ttyp:accessType>
  <ttyp:primaryKey ttyp:isVisible="true" ttyp:isEditable="true">
    <ttyp:definition>standard</ttyp:definition>
    <ttyp:kind>nonUnique</ttyp:kind>
    <ttyp:components ttyp:isVisible="false"/>
    <ttyp:alias/>
  </ttyp:primaryKey>
  <ttyp:secondaryKeys ttyp:isVisible="true" ttyp:isEditable="true">
    <ttyp:allowed>notSpecified</ttyp:allowed>
  </ttyp:secondaryKeys>
</ttyp:tableType>`;
          
          // Update table type with complete definition
          const updateUrl = `/sap/bc/adt/ddic/tabletypes/${tableTypeName.toLowerCase()}?lockHandle=${lockHandle}&corrNr=${transportRequest}`;
          
          await this.client.put(
            updateUrl,
            completeXml,
            {
              headers: {
                'X-CSRF-Token': this.csrfToken,
                'Accept': 'application/vnd.sap.adt.tabletype.v1+xml',
                'Content-Type': 'application/vnd.sap.adt.tabletype.v1+xml; charset=utf-8'
              }
            }
          );
          
          log(`[CREATE TABLE TYPE] Table type definition completed`);
          
          // Unlock the table type
          await this.unlockObject(tableTypeName.toUpperCase(), 'TTYP', lockHandle);
          
          return {
            success: true,
            tableTypeName: tableTypeName.toUpperCase(),
            transportRequest,
            packageName,
            lineType: lineType.toUpperCase(),
            tableCategory,
            keyDefinition,
            message: 'Table Type created with complete definition',
            httpStatus: response.status
          };
        } catch (error) {
          // Unlock on error
          try {
            await this.unlockObject(tableTypeName.toUpperCase(), 'TTYP', lockHandle);
          } catch (unlockError) {
            log(`[CREATE TABLE TYPE] Failed to unlock: ${unlockError.message}`);
          }
          throw error;
        }
      }

      return {
        success: true,
        tableTypeName: tableTypeName.toUpperCase(),
        transportRequest,
        packageName,
        message: 'Table Type metadata created successfully (use SE11 to define line type)',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[CREATE TABLE TYPE] FAILED: ${error.message}`);
      log(`[CREATE TABLE TYPE] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Create a new Structure (with optional DDL field definitions)
   * Structures use DDL syntax like CDS views
   * Endpoint: POST /sap/bc/adt/ddic/structures?corrNr={transport}
   */
  async createStructure(structureName, description, packageName, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        language = 'EN',
        masterLanguage = 'EN',
        responsible = SAP_CONFIG.username,
        fields = null
      } = options;

      // Build XML request for structure creation
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?><blue:blueSource xmlns:blue="http://www.sap.com/wbobj/blue" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${structureName.toUpperCase()}" adtcore:type="TABL/DS" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="S4H" adtcore:responsible="${responsible}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
</blue:blueSource>`;

      const response = await this.client.post(
        `/sap/bc/adt/ddic/structures?corrNr=${transportRequest}`,
        xmlRequest,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Accept': 'application/vnd.sap.adt.blues.v1+xml, application/vnd.sap.adt.structures.v2+xml',
            'Content-Type': 'application/vnd.sap.adt.structures.v2+xml'
          }
        }
      );

      log(`[CREATE STRUCTURE] Structure created: ${structureName.toUpperCase()}`);

      // Step 2: If fields provided, add DDL source code
      if (fields && fields.length > 0) {
        log(`[CREATE STRUCTURE] Adding ${fields.length} fields to structure via DDL`);
        
        // Lock the structure
        const lockResult = await this.lockObject(structureName.toUpperCase(), 'TABL');
        if (!lockResult.success) {
          throw new Error(`Failed to lock structure: ${lockResult.error}`);
        }
        
        const lockHandle = lockResult.lockHandle;
        
        try {
          // Build DDL source code for structure
          let fieldsDdl = '';
          fields.forEach((field) => {
            const fieldName = field.field_name || field.name;
            const dataElement = field.data_element || field.dataElement;
            const dataType = field.data_type || field.dataType;
            const length = field.length || '0';
            const decimals = field.decimals || '0';
            
            // Build field DDL line
            if (dataElement) {
              // Use data element
              fieldsDdl += `  ${fieldName.toLowerCase()} : ${dataElement.toLowerCase()};\n`;
            } else if (dataType) {
              // Use direct type
              const abapType = this.mapToAbapDdlType(dataType, length, decimals);
              fieldsDdl += `  ${fieldName.toLowerCase()} : ${abapType};\n`;
            }
          });
          
          // Build complete DDL source
          const ddlSource = `@EndUserText.label : '${description}'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
define structure ${structureName.toLowerCase()} {

${fieldsDdl}
}`;
          
          // Update structure with DDL source (plain text!)
          const updateUrl = `/sap/bc/adt/ddic/structures/${structureName.toLowerCase()}/source/main?lockHandle=${lockHandle}&corrNr=${transportRequest}`;
          
          await this.client.put(
            updateUrl,
            ddlSource,
            {
              headers: {
                'X-CSRF-Token': this.csrfToken,
                'Content-Type': 'text/plain; charset=utf-8'
              }
            }
          );
          
          log(`[CREATE STRUCTURE] Structure DDL source added successfully`);
          
          // Unlock the structure
          await this.unlockObject(structureName.toUpperCase(), 'TABL', lockHandle);
          
          return {
            success: true,
            structureName: structureName.toUpperCase(),
            transportRequest,
            packageName,
            fieldCount: fields.length,
            message: 'Structure created with DDL field definitions',
            httpStatus: response.status
          };
        } catch (error) {
          // Unlock on error
          try {
            await this.unlockObject(structureName.toUpperCase(), 'TABL', lockHandle);
          } catch (unlockError) {
            log(`[CREATE STRUCTURE] Failed to unlock: ${unlockError.message}`);
          }
          throw error;
        }
      }

      return {
        success: true,
        structureName: structureName.toUpperCase(),
        transportRequest,
        packageName,
        message: 'Structure metadata created successfully (use SE11 or Eclipse ADT to add fields)',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[CREATE STRUCTURE] FAILED: ${error.message}`);
      log(`[CREATE STRUCTURE] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }
  
  /**
   * Helper: Map SAP data types to ABAP DDL types
   */
  mapToAbapDdlType(dataType, length, decimals) {
    const typeUpper = dataType.toUpperCase();
    
    switch (typeUpper) {
      case 'CHAR':
        return `abap.char(${length})`;
      case 'NUMC':
        return `abap.numc(${length})`;
      case 'INT4':
        return 'abap.int4';
      case 'INT8':
        return 'abap.int8';
      case 'DEC':
      case 'DECIMAL':
        return `abap.dec(${length},${decimals})`;
      case 'STRING':
        return 'abap.string(0)';
      case 'DATS':
        return 'abap.dats';
      case 'TIMS':
        return 'abap.tims';
      case 'CURR':
        return `abap.curr(${length},${decimals})`;
      case 'QUAN':
        return `abap.quan(${length},${decimals})`;
      default:
        return `abap.char(${length})`;
    }
  }

  /**
   * Create a Service Definition (SRVD)
   * Endpoint: POST /sap/bc/adt/ddic/srvd/sources?corrNr={transport}
   */
  async createServiceDefinition(serviceName, description, packageName, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        language = 'EN',
        masterLanguage = 'EN',
        responsible = SAP_CONFIG.username,
        ddlSource = null
      } = options;

      // Step 1: Optional name validation
      if (options.validateName !== false) {
        try {
          const validationUrl = `/sap/bc/adt/ddic/srvd/sources/validation?objtype=srvdsrv&objname=${serviceName.toUpperCase()}&description=${encodeURIComponent(description)}`;
          
          await this.client.post(validationUrl, '', {
            headers: {
              'Accept': 'application/vnd.sap.as+xml',
              'X-CSRF-Token': this.csrfToken,
              'X-sap-adt-sessiontype': 'stateful'
            }
          });
          
          log(`[CREATE SERVICE DEF] Name validation passed for ${serviceName}`);
        } catch (validationError) {
          log(`[CREATE SERVICE DEF] Name validation warning: ${validationError.message}`);
          // Continue anyway - validation is optional
        }
      }

      // Step 2: Create service definition metadata
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?><srvd:srvdSource xmlns:srvd="http://www.sap.com/adt/ddic/srvdsources" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${serviceName.toUpperCase()}" adtcore:type="SRVD/SRV" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="S4H" adtcore:responsible="${responsible}" srvd:srvdSourceType="S">
  <adtcore:packageRef adtcore:name="${packageName}"/>
</srvd:srvdSource>`;

      let createUrl = '/sap/bc/adt/ddic/srvd/sources';
      if (transportRequest && transportRequest.trim() !== '') {
        createUrl += `?corrNr=${transportRequest}`;
      }

      const response = await this.client.post(createUrl, xmlRequest, {
        headers: {
          'Accept': 'application/vnd.sap.adt.ddic.srvd.v1+xml',
          'Content-Type': 'application/vnd.sap.adt.ddic.srvd.v1+xml',
          'X-CSRF-Token': this.csrfToken,
          'X-sap-adt-sessiontype': 'stateful'
        }
      });

      log(`[CREATE SERVICE DEF] Service definition ${serviceName} created successfully`);

      // Step 3: If DDL source provided, save it
      if (ddlSource) {
        log(`[CREATE SERVICE DEF] Adding DDL source code`);

        // Lock the object
        const lockResult = await this.lockObject(serviceName.toUpperCase(), 'SRVD', transportRequest);
        if (!lockResult.success) {
          throw new Error(`Failed to lock service definition: ${lockResult.error}`);
        }

        try {
          // Save DDL source to /source/main
          const sourceUrl = `/sap/bc/adt/ddic/srvd/sources/${serviceName.toLowerCase()}/source/main`;
          let saveUrl = `${sourceUrl}?lockHandle=${encodeURIComponent(lockResult.lockHandle)}`;
          if (transportRequest && transportRequest.trim() !== '') {
            saveUrl += `&corrNr=${transportRequest}`;
          }

          await this.client.put(saveUrl, ddlSource, {
            headers: {
              'Accept': 'text/plain',
              'Content-Type': 'text/plain; charset=utf-8',
              'X-CSRF-Token': this.csrfToken,
              'X-sap-adt-sessiontype': 'stateful'
            }
          });

          log(`[CREATE SERVICE DEF] DDL source saved successfully`);

          // Unlock after saving
          await this.unlockObject(serviceName.toUpperCase(), 'SRVD', lockResult.lockHandle);

          return {
            success: true,
            serviceName: serviceName.toUpperCase(),
            transportRequest,
            packageName,
            message: 'Service Definition created with DDL source (ready to activate)',
            httpStatus: response.status
          };
        } catch (error) {
          // Unlock on error
          try {
            await this.unlockObject(serviceName.toUpperCase(), 'SRVD', lockResult.lockHandle);
          } catch (unlockError) {
            log(`[CREATE SERVICE DEF] Failed to unlock: ${unlockError.message}`);
          }
          throw error;
        }
      }

      return {
        success: true,
        serviceName: serviceName.toUpperCase(),
        transportRequest,
        packageName,
        message: 'Service Definition metadata created (add DDL source next)',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[CREATE SERVICE DEF] FAILED: ${error.message}`);
      log(`[CREATE SERVICE DEF] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Create a Service Binding (SRVB)
   * Endpoint: POST /sap/bc/adt/businessservices/bindings/validation (optional)
   * Then: POST /sap/bc/adt/businessservices/bindings
   */
  async createServiceBinding(bindingName, description, serviceDefinition, packageName, transportRequest, options = {}, retryCount = 0) {
    try {
      await this.getCsrfToken();
      
      const {
        language = 'EN',
        masterLanguage = 'EN',
        responsible = SAP_CONFIG.username,
        bindingType = 'ODATA',
        bindingVersion = 'V4',
        serviceType = 'UI'  // UI or WEB_API
      } = options;
      
      // Calculate binding category based on service type
      // VERIFIED with actual Eclipse ADT behavior:
      // Category 0 = UI (for both V2 and V4)
      // Category 1 = Web API (for both V2 and V4)
      // The version (V2/V4) is independent of category!
      let bindingCategory;
      if (serviceType === 'WEB_API') {
        bindingCategory = '1';  // Web API
      } else {
        bindingCategory = '0';  // UI (default)
      }

      // Step 1: Optional validation
      try {
        const validationUrl = `/sap/bc/adt/businessservices/bindings/validation?objname=${bindingName.toUpperCase()}&description=${encodeURIComponent(description)}&serviceBindingVersion=${bindingType}%5CV${bindingVersion}&serviceDefinition=${serviceDefinition.toUpperCase()}&package=${encodeURIComponent(packageName)}`;
        
        await this.client.post(validationUrl, '', {
          headers: {
            'Accept': 'application/vnd.sap.as+xml',
            'X-CSRF-Token': this.csrfToken,
            'X-sap-adt-sessiontype': 'stateful'
          }
        });
        
        log(`[CREATE SERVICE BINDING] Validation passed for ${bindingName}`);
      } catch (validationError) {
        log(`[CREATE SERVICE BINDING] Validation warning: ${validationError.message}`);
        // Continue anyway - validation is optional
      }

      // Step 2: Create service binding
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?><srvb:serviceBinding xmlns:srvb="http://www.sap.com/adt/ddic/ServiceBindings" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${bindingName.toUpperCase()}" adtcore:type="SRVB/SVB" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="S4H" adtcore:responsible="${responsible}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
  <srvb:services srvb:name="${serviceDefinition.toUpperCase()}">
    <srvb:content srvb:version="0001">
      <srvb:serviceDefinition adtcore:name="${serviceDefinition.toUpperCase()}"/>
    </srvb:content>
  </srvb:services>
  <srvb:binding srvb:category="${bindingCategory}" srvb:type="${bindingType}" srvb:version="${bindingVersion}">
    <srvb:implementation adtcore:name=""/>
  </srvb:binding>
</srvb:serviceBinding>`;

      let createUrl = '/sap/bc/adt/businessservices/bindings';
      if (transportRequest && transportRequest.trim() !== '') {
        createUrl += `?corrNr=${transportRequest}`;
      }

      log(`[CREATE SERVICE BINDING] Creating service binding: ${bindingName}`);
      log(`[CREATE SERVICE BINDING] Service Definition: ${serviceDefinition}`);
      log(`[CREATE SERVICE BINDING] Binding Type: ${bindingType} ${bindingVersion}`);

      const response = await this.client.post(createUrl, xmlRequest, {
        headers: {
          'Accept': 'application/vnd.sap.adt.businessservices.servicebinding.v1+xml, application/vnd.sap.adt.businessservices.servicebinding.v2+xml',
          'Content-Type': 'application/vnd.sap.adt.businessservices.servicebinding.v2+xml',
          'X-CSRF-Token': this.csrfToken,
          'X-sap-adt-sessiontype': 'stateful'
        }
      });

      log(`[CREATE SERVICE BINDING] Service binding ${bindingName} created successfully (HTTP ${response.status})`);
      log(`[CREATE SERVICE BINDING] Response body: ${JSON.stringify(response.data)}`);
      
      // Note: Service bindings are configuration objects (not source code objects)
      // They are created immediately and don't need verification
      // You can verify by trying to activate them
      
      return {
        success: true,
        bindingName: bindingName.toUpperCase(),
        serviceDefinition: serviceDefinition.toUpperCase(),
        transportRequest,
        packageName,
        bindingType,
        bindingVersion,
        serviceType,
        bindingCategory,
        message: 'Service Binding created successfully (ready to activate and publish)',
        httpStatus: response.status,
        note: 'Service binding metadata created. Use adt_activate to generate the binding implementation.'
      };

    } catch (error) {
      log(`[CREATE SERVICE BINDING] FAILED: ${error.message}`);
      log(`[CREATE SERVICE BINDING] HTTP Status: ${error.response?.status}`);
      log(`[CREATE SERVICE BINDING] Response: ${JSON.stringify(error.response?.data)}`);
      
      // Check if it's a session error and retry once
      if (this.isSessionError(error) && retryCount === 0) {
        log('[CREATE SERVICE BINDING] Session error detected, resetting and retrying...');
        this.resetSession();
        return await this.createServiceBinding(bindingName, description, serviceDefinition, packageName, transportRequest, options, retryCount + 1);
      }
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details || error.response?.data,
        hint: errorDetails.hint
      };
    }
  }

  /**
   * Read Service Binding metadata
   * Endpoint: GET /sap/bc/adt/businessservices/bindings/{name}
   */
  async readServiceBinding(bindingName, retryCount = 0) {
    try {
      await this.getCsrfToken();
      
      const uri = `/sap/bc/adt/businessservices/bindings/${bindingName.toLowerCase()}`;
      
      log(`[READ SERVICE BINDING] Reading metadata for: ${bindingName}`);
      
      const response = await this.client.get(uri, {
        headers: {
          'Accept': 'application/vnd.sap.adt.businessservices.servicebinding.v1+xml, application/vnd.sap.adt.businessservices.servicebinding.v2+xml',
          'X-CSRF-Token': this.csrfToken,
          'X-sap-adt-sessiontype': 'stateful'
        }
      });
      
      // Parse the XML response to extract key information
      const metadata = xmlParser.parse(response.data);
      const binding = metadata['srvb:serviceBinding'];
      
      log(`[READ SERVICE BINDING] Successfully read metadata`);
      
      return {
        success: true,
        bindingName: bindingName.toUpperCase(),
        metadata: {
          name: binding['@_adtcore:name'],
          type: binding['@_adtcore:type'],
          description: binding['@_adtcore:description'],
          version: binding['@_adtcore:version'],
          packageName: binding['adtcore:packageRef']?.['@_adtcore:name'],
          serviceDefinition: binding['srvb:services']?.['srvb:content']?.['srvb:serviceDefinition']?.['@_adtcore:name'],
          bindingType: binding['srvb:binding']?.['@_srvb:type'],
          bindingVersion: binding['srvb:binding']?.['@_srvb:version'],
          bindingCategory: binding['srvb:binding']?.['@_srvb:category'],
          published: binding['@_srvb:published'] === 'true',
          bindingCreated: binding['@_srvb:bindingCreated'] === 'true',
          releaseSupported: binding['@_srvb:releaseSupported'] === 'true',
          createdBy: binding['@_adtcore:createdBy'],
          createdAt: binding['@_adtcore:createdAt'],
          changedBy: binding['@_adtcore:changedBy'],
          changedAt: binding['@_adtcore:changedAt']
        },
        rawXml: response.data
      };
      
    } catch (error) {
      log(`[READ SERVICE BINDING] FAILED: ${error.message}`);
      log(`[READ SERVICE BINDING] HTTP Status: ${error.response?.status}`);
      
      // Check if it's a session error and retry once
      if (this.isSessionError(error) && retryCount === 0) {
        log('[READ SERVICE BINDING] Session error detected, resetting and retrying...');
        this.resetSession();
        return await this.readServiceBinding(bindingName, retryCount + 1);
      }
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint || 'Service binding may not exist or you may not have read authorization'
      };
    }
  }

  /**
   * Create a Behavior Definition (BDEF)
   * Endpoint: POST /sap/bc/adt/bo/behaviordefinitions?corrNr={transport}
   * Then: PUT /sap/bc/adt/bo/behaviordefinitions/{name}/source/main
   */
  async createBehaviorDefinition(bdefName, description, packageName, transportRequest, sourceCode) {
    try {
      await this.getCsrfToken();
      
      const name = bdefName.toLowerCase();
      const {
        language = 'EN',
        masterLanguage = 'EN',
        responsible = SAP_CONFIG.username,
        implementationType = 'Managed'
      } = {};
      
      // Step 1: Create behavior definition metadata
      const corrNr = transportRequest || '';
      const createUrl = `/sap/bc/adt/bo/behaviordefinitions${corrNr ? `?corrNr=${corrNr}` : ''}`;
      
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?><blue:blueSource xmlns:blue="http://www.sap.com/wbobj/blue" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${bdefName.toUpperCase()}" adtcore:type="BDEF/BDO" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="S4H" adtcore:responsible="${responsible}">
  <adtcore:adtTemplate>
    <adtcore:adtProperty adtcore:key="implementation_type">${implementationType}</adtcore:adtProperty>
  </adtcore:adtTemplate>
  <adtcore:packageRef adtcore:name="${packageName}"/>
</blue:blueSource>`;
      
      log(`[CREATE BDEF] Creating behavior definition metadata: ${bdefName}`);
      
      const createResponse = await this.client.post(createUrl, xmlRequest, {
        headers: {
          'X-CSRF-Token': this.csrfToken,
          'Content-Type': 'application/vnd.sap.adt.blues.v1+xml',
          'Accept': 'application/vnd.sap.adt.blues.v1+xml',
          'X-sap-adt-sessiontype': 'stateful'
        }
      });
      
      log(`[CREATE BDEF] Metadata created successfully`);
      
      // Step 2: Lock the behavior definition
      const lockUrl = `/sap/bc/adt/bo/behaviordefinitions/${name}?_action=LOCK&accessMode=MODIFY`;
      
      log(`[CREATE BDEF] Locking behavior definition`);
      
      const lockResponse = await this.client.post(lockUrl, '', {
        headers: {
          'X-CSRF-Token': this.csrfToken,
          'Content-Type': 'application/xml',
          'Accept': 'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9',
          'X-sap-adt-profiling': 'server-time',
          'X-sap-adt-sessiontype': 'stateful'
        }
      });
      
      const lockData = xmlParser.parse(lockResponse.data);
      const lockHandle = lockData['asx:abap']['asx:values'].DATA.LOCK_HANDLE;
      
      log(`[CREATE BDEF] Lock successful, handle: ${lockHandle}`);
      
      // Step 3: Save behavior definition source
      const saveUrl = `/sap/bc/adt/bo/behaviordefinitions/${name}/source/main?lockHandle=${encodeURIComponent(lockHandle)}${corrNr ? `&corrNr=${corrNr}` : ''}`;
      
      log(`[CREATE BDEF] Saving source code`);
      
      await this.client.put(saveUrl, sourceCode, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Accept': 'text/plain',
          'X-CSRF-Token': this.csrfToken,
          'X-sap-adt-sessiontype': 'stateful'
        }
      });
      
      log(`[CREATE BDEF] Source saved successfully`);
      
      // Step 4: Unlock
      const unlockUrl = `/sap/bc/adt/bo/behaviordefinitions/${name}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`;
      
      await this.client.post(unlockUrl, '', {
        headers: {
          'X-CSRF-Token': this.csrfToken,
          'X-sap-adt-sessiontype': 'stateful'
        }
      });
      
      log(`[CREATE BDEF] Unlocked successfully`);
      
      return {
        success: true,
        bdefName: bdefName.toUpperCase(),
        description,
        packageName,
        transportRequest,
        message: 'Behavior definition created successfully',
        uri: `/sap/bc/adt/bo/behaviordefinitions/${name}`
      };
      
    } catch (error) {
      log(`[CREATE BDEF] FAILED: ${error.message}`);
      log(`[CREATE BDEF] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Create Metadata Extension (DDLX)
   * 
   * Creates a new metadata extension for adding UI annotations to CDS views.
   * 
   * @param {string} metadataExtensionName - Name of the metadata extension (e.g., ZC_CUSTOMER)
   * @param {string} description - Description
   * @param {string} packageName - Package name
   * @param {string} transportRequest - Transport request number (optional)
   * @param {string} sourceCode - Optional DDLX source code
   * @returns {Object} Result object with success status and details
   */
  async createMetadataExtension(metadataExtensionName, description, packageName, transportRequest, sourceCode = '') {
    try {
      await this.getCsrfToken();
      
      const name = metadataExtensionName.toLowerCase();
      const {
        language = 'EN',
        masterLanguage = 'EN',
        masterSystem = 'S4H',
        responsible = SAP_CONFIG.username
      } = {};
      
      // Step 1: Validate metadata extension name (optional but recommended)
      const validateUrl = `/sap/bc/adt/ddic/ddlx/sources/validation?objtype=ddlxex&objname=${metadataExtensionName.toUpperCase()}&description=${encodeURIComponent(description)}`;
      
      log(`[CREATE DDLX] Validating metadata extension name: ${metadataExtensionName}`);
      
      try {
        await this.client.post(validateUrl, '', {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Accept': 'application/vnd.sap.as+xml',
            'X-sap-adt-sessiontype': 'stateful'
          }
        });
        log(`[CREATE DDLX] Validation successful`);
      } catch (validationError) {
        log(`[CREATE DDLX] Validation warning (continuing anyway): ${validationError.message}`);
      }
      
      // Step 2: Create metadata extension metadata
      const corrNr = transportRequest || '';
      const createUrl = `/sap/bc/adt/ddic/ddlx/sources${corrNr ? `?corrNr=${corrNr}` : ''}`;
      
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?><ddlx:ddlxSource xmlns:ddlx="http://www.sap.com/adt/ddic/ddlxsources" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${metadataExtensionName.toUpperCase()}" adtcore:type="DDLX/EX" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="${masterSystem}" adtcore:responsible="${responsible}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
</ddlx:ddlxSource>`;
      
      log(`[CREATE DDLX] Creating metadata extension: ${metadataExtensionName}`);
      
      const createResponse = await this.client.post(createUrl, xmlRequest, {
        headers: {
          'X-CSRF-Token': this.csrfToken,
          'Content-Type': 'application/vnd.sap.adt.ddic.ddlx.v1+xml',
          'Accept': 'application/vnd.sap.adt.ddic.ddlx.v1+xml',
          'X-sap-adt-sessiontype': 'stateful'
        }
      });
      
      log(`[CREATE DDLX] Metadata extension created successfully`);
      
      // Step 3: If source code is provided, lock and save it
      if (sourceCode) {
        // Lock the metadata extension
        const lockUrl = `/sap/bc/adt/ddic/ddlx/sources/${name}?_action=LOCK&accessMode=MODIFY`;
        
        log(`[CREATE DDLX] Locking metadata extension`);
        
        const lockResponse = await this.client.post(lockUrl, '', {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Accept': 'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9',
            'X-sap-adt-sessiontype': 'stateful'
          }
        });
        
        const lockData = xmlParser.parse(lockResponse.data);
        const lockHandle = lockData['asx:abap']['asx:values'].DATA.LOCK_HANDLE;
        
        log(`[CREATE DDLX] Lock successful, handle: ${lockHandle}`);
        
        // Save source code
        const saveUrl = `/sap/bc/adt/ddic/ddlx/sources/${name}/source/main?lockHandle=${encodeURIComponent(lockHandle)}${corrNr ? `&corrNr=${corrNr}` : ''}`;
        
        log(`[CREATE DDLX] Saving source code`);
        
        await this.client.put(saveUrl, sourceCode, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Accept': 'text/plain',
            'X-CSRF-Token': this.csrfToken,
            'X-sap-adt-sessiontype': 'stateful'
          }
        });
        
        log(`[CREATE DDLX] Source saved successfully`);
        
        // Unlock
        const unlockUrl = `/sap/bc/adt/ddic/ddlx/sources/${name}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`;
        
        await this.client.post(unlockUrl, '', {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'X-sap-adt-sessiontype': 'stateful'
          }
        });
        
        log(`[CREATE DDLX] Unlocked successfully`);
      }
      
      return {
        success: true,
        metadataExtensionName: metadataExtensionName.toUpperCase(),
        description,
        packageName,
        transportRequest,
        message: 'Metadata extension created successfully',
        uri: `/sap/bc/adt/ddic/ddlx/sources/${name}`
      };
      
    } catch (error) {
      log(`[CREATE DDLX] FAILED: ${error.message}`);
      log(`[CREATE DDLX] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Generate RAP UI Service using Eclipse ADT Generator
   * This is the PREFERRED method for RAP generation - uses Eclipse's proven generator
   * 
   * Endpoint: POST /sap/bc/adt/businessservices/generators/uiservice
   * 
   * Generates complete RAP stack:
   * - R-layer CDS View (ZR_*)
   * - C-layer CDS View (ZC_*)
   * - Behavior Definition and Implementation
   * - Draft Table
   * - Service Definition
   * - Service Binding (OData V4)
   * 
   * @param {string} tableName - Database table name (e.g., "ZTTMAT")
   * @param {string} packageName - ABAP package
   * @param {string} transportRequest - Transport request number
   * @param {object} options - Optional configuration
   * @returns {object} Generation result with created object names
   */
  async generateRapUiService(tableName, packageName, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        description = tableName,
        masterLanguage = 'EN',
        customNames = null  // Allow user to customize generated names
      } = options;

      log(`[RAP GENERATOR] Starting RAP UI Service generation for table: ${tableName}`);
      
      // Step 1: Get default naming proposal from ADT
      log(`[RAP GENERATOR] Step 1: Getting naming proposal...`);
      const tableUri = `/sap/bc/adt/ddic/tables/${tableName.toLowerCase()}`;
      const contentUrl = `/sap/bc/adt/businessservices/generators/uiservice/content?referencedObject=${encodeURIComponent(tableUri)}&package=${packageName}`;
      
      const contentResponse = await this.client.get(contentUrl, {
        headers: {
          'Accept': 'application/vnd.sap.adt.repository.generator.content.v1+json'
        }
      });
      
      const defaultContent = contentResponse.data;
      log(`[RAP GENERATOR] Default naming proposal received`);
      log(`[RAP GENERATOR] R-layer: ${defaultContent.businessObject.dataModelEntity.cdsName}`);
      log(`[RAP GENERATOR] C-layer: ${defaultContent.serviceProjection.name}`);
      log(`[RAP GENERATOR] Service: ${defaultContent.businessService.serviceDefinition.name}`);

      // Step 2: Merge with custom names if provided
      const content = customNames ? {
        ...defaultContent,
        general: {
          ...defaultContent.general,
          description: description
        },
        businessObject: {
          ...defaultContent.businessObject,
          dataModelEntity: {
            cdsName: customNames.rLayerCds || defaultContent.businessObject.dataModelEntity.cdsName
          },
          behavior: {
            ...defaultContent.businessObject.behavior,
            implementationClass: customNames.behaviorClass || defaultContent.businessObject.behavior.implementationClass,
            draftTable: customNames.draftTable || defaultContent.businessObject.behavior.draftTable
          }
        },
        serviceProjection: {
          name: customNames.cLayerCds || defaultContent.serviceProjection.name
        },
        businessService: {
          serviceDefinition: {
            name: customNames.serviceDefinition || defaultContent.businessService.serviceDefinition.name
          },
          serviceBinding: {
            name: customNames.serviceBinding || defaultContent.businessService.serviceDefinition.name,
            bindingType: defaultContent.businessService.serviceBinding.bindingType
          }
        }
      } : {
        ...defaultContent,
        general: {
          ...defaultContent.general,
          description: description
        }
      };

      // Add metadata
      content.metadata = {
        package: packageName,
        masterLanguage: masterLanguage
      };

      log(`[RAP GENERATOR] Step 2: Configuration prepared`);

      // Step 3: Validate configuration
      log(`[RAP GENERATOR] Step 3: Validating configuration...`);
      const validateUrl = `/sap/bc/adt/businessservices/generators/uiservice/validation?referencedObject=${encodeURIComponent(tableUri)}`;
      
      await this.client.post(validateUrl, content, {
        headers: {
          'X-CSRF-Token': this.csrfToken,
          'Accept': 'application/vnd.sap.adt.validationMessages.v1+xml, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.StatusMessage',
          'Content-Type': 'application/vnd.sap.adt.repository.generator.content.v1+json'
        }
      });

      log(`[RAP GENERATOR] Validation passed`);

      // Step 4: Generate RAP artifacts!
      log(`[RAP GENERATOR] Step 4: Generating RAP artifacts...`);
      let generateUrl = `/sap/bc/adt/businessservices/generators/uiservice?referencedObject=${encodeURIComponent(tableUri)}`;
      if (transportRequest && transportRequest.trim() !== '') {
        generateUrl += `&corrNr=${transportRequest}`;
      }

      const generateResponse = await this.client.post(generateUrl, content, {
        headers: {
          'X-CSRF-Token': this.csrfToken,
          'Accept': 'application/vnd.sap.adt.repository.generator.v1+json',
          'Content-Type': 'application/vnd.sap.adt.repository.generator.content.v1+json'
        }
      });

      // Parse response to get service binding URI
      const xmlResponse = generateResponse.data;
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      });
      const result = parser.parse(xmlResponse);
      
      const objectRef = result['adtcore:objectReferences']['adtcore:objectReference'];
      const serviceBindingUri = objectRef['@_adtcore:uri'];
      const serviceBindingName = objectRef['@_adtcore:name'];

      log(`[RAP GENERATOR] ✅ Generation successful!`);
      log(`[RAP GENERATOR] Service Binding: ${serviceBindingName}`);
      log(`[RAP GENERATOR] URI: ${serviceBindingUri}`);

      return {
        success: true,
        tableName: tableName.toUpperCase(),
        package: packageName,
        transportRequest: transportRequest,
        generated: {
          rLayerCds: content.businessObject.dataModelEntity.cdsName,
          cLayerCds: content.serviceProjection.name,
          behaviorClass: content.businessObject.behavior.implementationClass,
          draftTable: content.businessObject.behavior.draftTable,
          serviceDefinition: content.businessService.serviceDefinition.name,
          serviceBinding: serviceBindingName,
          serviceBindingUri: serviceBindingUri
        },
        message: 'RAP UI Service generated successfully!'
      };

    } catch (error) {
      log(`[RAP GENERATOR] ❌ Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        httpStatus: error.response?.status,
        details: error.response?.data
      };
    }
  }

  /**
   * Generate Custom Query (Abstract Entity + Query Provider Class)
   * Creates a complete custom query implementation with:
   * - Abstract Entity (CDS)
   * - Query Provider Class implementing if_rap_query_provider
   * - Optional Service Definition
   * 
   * @param {string} entityName - Abstract entity name (e.g., "ZCE_PRODUCT_SEARCH")
   * @param {string} queryClassName - Query provider class name (e.g., "ZCL_PRODUCT_SEARCH")
   * @param {string} description - Description
   * @param {string} packageName - Package
   * @param {string} transportRequest - Transport request
   * @param {object} options - Configuration
   * @returns {object} Generation result
   */
  async generateCustomQuery(entityName, queryClassName, description, packageName, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        inputParameters = [],
        outputFields = [],
        createService = false,
        serviceName = null
      } = options;

      log(`[CUSTOM QUERY] Starting generation for ${entityName}`);
      
      const results = {
        entityName: entityName.toUpperCase(),
        queryClassName: queryClassName.toUpperCase(),
        createdArtifacts: []
      };

      // Step 1: Generate Abstract Entity DDL
      log(`[CUSTOM QUERY] Step 1: Generating abstract entity DDL`);
      
      const entityDDL = this.generateAbstractEntityDDL(
        entityName,
        description,
        queryClassName,
        inputParameters,
        outputFields
      );

      // Step 2: Create CDS View (Abstract Entity)
      log(`[CUSTOM QUERY] Step 2: Creating abstract entity ${entityName}`);
      
      const cdsResult = await this.createCdsView(
        entityName,
        description,
        packageName,
        transportRequest,
        { ddlSource: entityDDL }
      );

      if (!cdsResult.success) {
        throw new Error(`Failed to create abstract entity: ${cdsResult.error}`);
      }
      results.createdArtifacts.push(`Abstract Entity: ${entityName}`);

      // Step 3: Activate abstract entity FIRST (so class can reference it)
      log(`[CUSTOM QUERY] Step 3: Activating abstract entity`);
      
      const activateEntityResult = await this.activateObjects([
        { name: entityName, type: 'DDLS' }
      ]);

      if (!activateEntityResult.success) {
        throw new Error(`Failed to activate abstract entity: ${activateEntityResult.error}`);
      }

      // Step 4: Generate Query Provider Class Code
      log(`[CUSTOM QUERY] Step 4: Generating query provider class code`);
      
      const classCode = this.generateQueryProviderClass(
        queryClassName,
        entityName,
        description,
        inputParameters,
        outputFields
      );

      // Step 5: Create Query Provider Class and save implementation
      log(`[CUSTOM QUERY] Step 5: Creating query provider class ${queryClassName}`);
      
      const classResult = await this.createClass(
        queryClassName,
        description,
        packageName,
        transportRequest
      );

      if (!classResult.success) {
        throw new Error(`Failed to create query provider class: ${classResult.error}`);
      }

      // Step 6: Update with implementation (class is already locked from creation)
      log(`[CUSTOM QUERY] Step 6: Updating query provider with implementation`);
      
      const updateResult = await this.updateAndActivate(
        queryClassName,
        'CLAS',
        classCode
      );

      if (!updateResult.success) {
        throw new Error(`Failed to update class implementation: ${updateResult.error}`);
      }
      results.createdArtifacts.push(`Query Provider Class: ${queryClassName}`);

      // Step 7: Create Service Definition (optional)
      if (createService) {
        const srvName = serviceName || `ZAPI_${entityName.replace('ZCE_', '')}`;
        log(`[CUSTOM QUERY] Step 7: Creating service definition ${srvName}`);
        
        const serviceDDL = `@EndUserText.label: '${description} Service'
define service ${srvName} {
  expose ${entityName.toUpperCase()} as ${this.toCamelCase(entityName.replace('ZCE_', ''))};
}`;

        // Create service definition using generic approach
        const srvdResult = await this.createCdsView(
          srvName,
          `${description} Service`,
          packageName,
          transportRequest,
          { ddlSource: serviceDDL, objectType: 'SRVD' }
        );

        if (srvdResult.success) {
          results.createdArtifacts.push(`Service Definition: ${srvName}`);
          results.serviceName = srvName;
        }
      }

      // Step 8: Activate service definition (entity and class already activated)
      if (results.serviceName) {
        log(`[CUSTOM QUERY] Step 8: Activating service definition`);
        
        const activateResult = await this.activateObjects([
          { name: results.serviceName, type: 'SRVD' }
        ]);

        if (!activateResult.success) {
          log(`[CUSTOM QUERY] Warning: Service definition activation had issues`);
        }
      }

      log(`[CUSTOM QUERY] ✅ Custom query generated successfully!`);

      return {
        success: true,
        ...results,
        message: 'Custom query generated successfully!',
        nextSteps: [
          'Implement the query logic in the SELECT method',
          'Test the query via service binding',
          createService ? 'Create service binding for the service definition' : 'Create service definition and binding'
        ]
      };

    } catch (error) {
      log(`[CUSTOM QUERY] ❌ Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        httpStatus: error.response?.status,
        details: error.response?.data
      };
    }
  }

  /**
   * Generate Abstract Entity DDL source code
   */
  generateAbstractEntityDDL(entityName, description, queryClassName, inputParameters, outputFields) {
    const allFields = [...inputParameters, ...outputFields];
    
    let ddl = `@EndUserText.label: '${description}'
@ObjectModel.query.implementedBy: 'ABAP:${queryClassName.toUpperCase()}'
define custom entity ${entityName.toUpperCase()}
{\n`;

    allFields.forEach((field, index) => {
      const isInput = inputParameters.includes(field);
      const isKey = field.isKey || (index === 0); // First field is key by default
      
      let fieldDef = '  ';
      
      // Add annotations
      if (isInput) {
        fieldDef += `@Consumption.filter: { mandatory: ${field.mandatory || false} }\n  `;
      }
      
      if (field.label) {
        fieldDef += `@EndUserText.label: '${field.label}'\n  `;
      }
      
      // Add key modifier
      if (isKey) {
        fieldDef += 'key ';
      }
      
      // Add field definition
      const fieldName = field.name || field;
      const fieldType = field.type || 'abap.char(40)';
      fieldDef += `${fieldName} : ${fieldType};`;
      
      ddl += fieldDef + (index < allFields.length - 1 ? '\n' : '');
    });

    ddl += '\n}';
    
    return ddl;
  }

  /**
   * Generate Query Provider Class implementation
   */
  generateQueryProviderClass(className, entityName, description, inputParameters, outputFields) {
    const allParams = inputParameters.map(p => typeof p === 'string' ? p : p.name).join(', ');
    
    return `CLASS ${className.toLowerCase()} DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    INTERFACES if_rap_query_provider.
    
  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.



CLASS ${className.toLowerCase()} IMPLEMENTATION.

  METHOD if_rap_query_provider~select.
    
    " Get paging parameters
    DATA(top) = io_request->get_paging( )->get_page_size( ).
    DATA(skip) = io_request->get_paging( )->get_offset( ).
    DATA(requested_fields) = io_request->get_requested_elements( ).
    DATA(sort_order) = io_request->get_sort_elements( ).

    " Get filter parameters
    TRY.
        DATA(filter_conditions) = io_request->get_filter( )->get_as_ranges( ).
        
        " TODO: Extract your filter values here
        " Example:
${inputParameters.map(p => {
  const pname = typeof p === 'string' ? p : p.name;
  return `        " DATA(${pname}_range) = VALUE #( filter_conditions[ name = '${pname.toUpperCase()}' ]-range OPTIONAL ).`;
}).join('\n')}
        
      CATCH cx_rap_query_filter_no_range.
        " No filters provided
    ENDTRY.

    " TODO: Implement your custom query logic here
    " Examples:
    " - Call external APIs
    " - Query multiple tables with complex joins
    " - Perform calculations
    " - Aggregate data from various sources
    
    DATA lt_result TYPE STANDARD TABLE OF ${entityName.toLowerCase()}.
    
    " Example implementation:
    " SELECT ...
    "   FROM your_table
    "   WHERE field1 IN @filter_range
    "   INTO CORRESPONDING FIELDS OF TABLE @lt_result
    "   UP TO @top ROWS
    "   OFFSET @skip.

    " Set response data
    io_response->set_data( lt_result ).
    
    " Set total count (optional, for paging)
    IF io_request->is_total_numb_of_rec_requested( ).
      io_response->set_total_number_of_records( lines( lt_result ) ).
    ENDIF.

  ENDMETHOD.

ENDCLASS.`;
  }

  /**
   * Helper: Convert string to CamelCase
   */
  toCamelCase(str) {
    return str.toLowerCase()
      .split('_')
      .map((word, index) => 
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join('');
  }

  /**
   * Create a new ABAP interface (metadata only, no source yet)
   * Endpoint: POST /sap/bc/adt/oo/interfaces?corrNr={transport}
   */
  async createInterface(interfaceName, description, packageName, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        language = 'EN',
        masterLanguage = 'EN',
        responsible = SAP_CONFIG.username
      } = options;

      // Build XML request for interface creation
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<intf:abapInterface xmlns:intf="http://www.sap.com/adt/oo/interfaces" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${interfaceName.toUpperCase()}" adtcore:type="INTF/OI" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="S4H" adtcore:responsible="${responsible}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
</intf:abapInterface>`;

      const response = await this.client.post(
        `/sap/bc/adt/oo/interfaces?corrNr=${transportRequest}`,
        xmlRequest,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Content-Type': 'application/xml'
          }
        }
      );

      return {
        success: true,
        interfaceName: interfaceName.toUpperCase(),
        transportRequest,
        packageName,
        message: 'Interface metadata created successfully',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[CREATE INTERFACE] FAILED: ${error.message}`);
      log(`[CREATE INTERFACE] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Create a new ABAP program/report
   * Endpoint: POST /sap/bc/adt/programs/programs?corrNr={transport}
   */
  async createProgram(programName, description, packageName, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        programType = '1',  // 1=Executable, I=Include, M=Module Pool, S=Subroutine, F=Function Group, J=Interface Pool, K=Class Pool
        language = 'EN',
        masterLanguage = 'EN',
        responsible = SAP_CONFIG.username
      } = options;

      // Build XML request for program creation
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<program:abapProgram xmlns:program="http://www.sap.com/adt/programs/programs" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${programName.toUpperCase()}" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="S4H" adtcore:responsible="${responsible}" program:programType="${programType}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
</program:abapProgram>`;

      const response = await this.client.post(
        `/sap/bc/adt/programs/programs?corrNr=${transportRequest}`,
        xmlRequest,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Content-Type': 'application/xml'
          }
        }
      );

      return {
        success: true,
        programName: programName.toUpperCase(),
        programType,
        transportRequest,
        packageName,
        message: 'Program metadata created successfully',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[CREATE PROGRAM] FAILED: ${error.message}`);
      log(`[CREATE PROGRAM] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Create a new CDS View (DDL Source)
   * Endpoint: POST /sap/bc/adt/ddic/ddl/sources?corrNr={transport}
   */
  async createCdsView(cdsName, description, packageName, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        language = 'EN',
        masterLanguage = 'EN',
        responsible = SAP_CONFIG.username,
        ddlSource = null
      } = options;

      // Build XML request for CDS view creation (ddl: namespace, DDLS/DF type)
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?><ddl:ddlSource xmlns:ddl="http://www.sap.com/adt/ddic/ddlsources" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${cdsName.toUpperCase()}" adtcore:type="DDLS/DF" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="S4H" adtcore:responsible="${responsible}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
</ddl:ddlSource>`;

      const response = await this.client.post(
        `/sap/bc/adt/ddic/ddl/sources?corrNr=${transportRequest}`,
        xmlRequest,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Accept': 'application/vnd.sap.adt.ddlSource.v2+xml, application/vnd.sap.adt.ddlSource+xml',
            'Content-Type': 'application/vnd.sap.adt.ddlSource+xml'
          }
        }
      );

      log(`[CREATE CDS VIEW] CDS View created: ${cdsName.toUpperCase()}`);

      // Step 2: If DDL source provided, add the source code
      if (ddlSource) {
        log(`[CREATE CDS VIEW] Adding DDL source code to CDS View`);
        
        // Lock the CDS view
        const lockResult = await this.lockObject(cdsName.toUpperCase(), 'DDLS');
        if (!lockResult.success) {
          throw new Error(`Failed to lock CDS view: ${lockResult.error}`);
        }
        
        const lockHandle = lockResult.lockHandle;
        
        try {
          // Update CDS view with DDL source code (plain text, not XML!)
          const updateUrl = `/sap/bc/adt/ddic/ddl/sources/${cdsName.toLowerCase()}/source/main?lockHandle=${lockHandle}&corrNr=${transportRequest}`;
          
          await this.client.put(
            updateUrl,
            ddlSource,
            {
              headers: {
                'X-CSRF-Token': this.csrfToken,
                'Content-Type': 'text/plain; charset=utf-8'
              }
            }
          );
          
          log(`[CREATE CDS VIEW] DDL source code added successfully`);
          
          // Unlock the CDS view
          await this.unlockObject(cdsName.toUpperCase(), 'DDLS', lockHandle);
          
          return {
            success: true,
            cdsName: cdsName.toUpperCase(),
            transportRequest,
            packageName,
            hasDdlSource: true,
            message: 'CDS View created with DDL source code',
            httpStatus: response.status
          };
        } catch (error) {
          // Unlock on error
          try {
            await this.unlockObject(cdsName.toUpperCase(), 'DDLS', lockHandle);
          } catch (unlockError) {
            log(`[CREATE CDS VIEW] Failed to unlock: ${unlockError.message}`);
          }
          throw error;
        }
      }

      return {
        success: true,
        cdsName: cdsName.toUpperCase(),
        transportRequest,
        packageName,
        hasDdlSource: false,
        message: 'CDS View metadata created successfully (use Eclipse ADT to add DDL source)',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[CREATE CDS VIEW] FAILED: ${error.message}`);
      log(`[CREATE CDS VIEW] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Create a new Data Element
   * Endpoint: POST /sap/bc/adt/ddic/dataelements?corrNr={transport}
   */
  async createDataElement(dataElementName, description, packageName, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        language = 'EN',
        masterLanguage = 'EN',
        responsible = SAP_CONFIG.username,
        domainName = null,
        shortLabel = null,
        mediumLabel = null,
        longLabel = null
      } = options;

      // Build XML request for data element creation
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<dtel:wbobj xmlns:dtel="http://www.sap.com/wbobj/dictionary/dtel" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${dataElementName.toUpperCase()}" adtcore:type="DTEL/DE" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="S4H" adtcore:responsible="${responsible}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
</dtel:wbobj>`;

      const response = await this.client.post(
        `/sap/bc/adt/ddic/dataelements?corrNr=${transportRequest}`,
        xmlRequest,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Accept': 'application/vnd.sap.adt.blues.v1+xml, application/vnd.sap.adt.dataelements.v2+xml',
            'Content-Type': 'application/vnd.sap.adt.dataelements.v2+xml'
          }
        }
      );

      log(`[CREATE DATA ELEMENT] Data element created: ${dataElementName.toUpperCase()}`);

      // Step 2: If domain name provided, complete the data element definition
      if (domainName) {
        log(`[CREATE DATA ELEMENT] Completing data element definition with domain: ${domainName}`);
        
        // Lock the data element
        const lockResult = await this.lockObject(dataElementName.toUpperCase(), 'DTEL');
        if (!lockResult.success) {
          throw new Error(`Failed to lock data element: ${lockResult.error}`);
        }
        
        const lockHandle = lockResult.lockHandle;
        
        try {
          // Build complete data element XML with content
          const completeXml = `<?xml version="1.0" encoding="UTF-8"?><blue:wbobj xmlns:blue="http://www.sap.com/wbobj/dictionary/dtel" xmlns:adtcore="http://www.sap.com/adt/core" xmlns:dtel="http://www.sap.com/adt/dictionary/dataelements" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${dataElementName.toUpperCase()}" adtcore:type="DTEL/DE" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="S4H" adtcore:responsible="${responsible}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
  <dtel:dataElement>
    <dtel:typeKind>domain</dtel:typeKind>
    <dtel:typeName>${domainName.toUpperCase()}</dtel:typeName>
    <dtel:dataType/>
    <dtel:dataTypeLength>0</dtel:dataTypeLength>
    <dtel:dataTypeDecimals>0</dtel:dataTypeDecimals>
    <dtel:shortFieldLabel>${shortLabel || ''}</dtel:shortFieldLabel>
    <dtel:shortFieldLength>10</dtel:shortFieldLength>
    <dtel:shortFieldMaxLength>10</dtel:shortFieldMaxLength>
    <dtel:mediumFieldLabel>${mediumLabel || ''}</dtel:mediumFieldLabel>
    <dtel:mediumFieldLength>20</dtel:mediumFieldLength>
    <dtel:mediumFieldMaxLength>20</dtel:mediumFieldMaxLength>
    <dtel:longFieldLabel>${longLabel || ''}</dtel:longFieldLabel>
    <dtel:longFieldLength>40</dtel:longFieldLength>
    <dtel:longFieldMaxLength>40</dtel:longFieldMaxLength>
    <dtel:headingFieldLabel>${longLabel || ''}</dtel:headingFieldLabel>
    <dtel:headingFieldLength>55</dtel:headingFieldLength>
    <dtel:headingFieldMaxLength>55</dtel:headingFieldMaxLength>
    <dtel:searchHelp/>
    <dtel:searchHelpParameter/>
    <dtel:setGetParameter/>
    <dtel:defaultComponentName/>
    <dtel:deactivateInputHistory>false</dtel:deactivateInputHistory>
    <dtel:changeDocument>false</dtel:changeDocument>
    <dtel:leftToRightDirection>false</dtel:leftToRightDirection>
    <dtel:deactivateBIDIFiltering>false</dtel:deactivateBIDIFiltering>
  </dtel:dataElement>
</blue:wbobj>`;
          
          // Update data element with complete definition
          const updateUrl = `/sap/bc/adt/ddic/dataelements/${dataElementName.toLowerCase()}?lockHandle=${lockHandle}`;
          
          await this.client.put(
            updateUrl,
            completeXml,
            {
              headers: {
                'X-CSRF-Token': this.csrfToken,
                'Accept': 'application/vnd.sap.adt.dataelements.v1+xml, application/vnd.sap.adt.dataelements.v2+xml',
                'Content-Type': 'application/vnd.sap.adt.dataelements.v2+xml; charset=utf-8'
              }
            }
          );
          
          log(`[CREATE DATA ELEMENT] Data element definition completed`);
          
          // Unlock the data element
          await this.unlockObject(dataElementName.toUpperCase(), 'DTEL', lockHandle);
          
          return {
            success: true,
            dataElementName: dataElementName.toUpperCase(),
            transportRequest,
            packageName,
            domainName: domainName.toUpperCase(),
            shortLabel,
            mediumLabel,
            longLabel,
            message: 'Data Element created with complete definition',
            httpStatus: response.status
          };
        } catch (error) {
          // Unlock on error
          try {
            await this.unlockObject(dataElementName.toUpperCase(), 'DTEL', lockHandle);
          } catch (unlockError) {
            log(`[CREATE DATA ELEMENT] Failed to unlock: ${unlockError.message}`);
          }
          throw error;
        }
      }

      return {
        success: true,
        dataElementName: dataElementName.toUpperCase(),
        transportRequest,
        packageName,
        message: 'Data Element metadata created successfully (use SE11 to define domain reference)',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[CREATE DATA ELEMENT] FAILED: ${error.message}`);
      log(`[CREATE DATA ELEMENT] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Create a new Domain (with optional complete definition)
   * Endpoint: POST /sap/bc/adt/ddic/domains/validation?objtype=domadd&objname={name}&description={desc}
   */
  async createDomain(domainName, description, packageName, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        dataType = null,
        length = null,
        decimals = null
      } = options;
      
      // Step 1: Validate domain creation
      const validationUrl = `/sap/bc/adt/ddic/domains/validation?objtype=domadd&objname=${domainName.toUpperCase()}&description=${encodeURIComponent(description)}`;
      
      const validationResponse = await this.client.post(
        validationUrl,
        null,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Accept': 'application/vnd.sap.as+xml',
            'Content-Type': null
          }
        }
      );

      log(`[CREATE DOMAIN] Validation response: ${validationResponse.status}`);
      
      // Step 2: Create the actual domain
      const createUrl = `/sap/bc/adt/ddic/domains?corrNr=${transportRequest}`;
      
      const xmlBody = `<?xml version="1.0" encoding="UTF-8"?><doma:domain xmlns:doma="http://www.sap.com/dictionary/domain" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="EN" adtcore:name="${domainName.toUpperCase()}" adtcore:type="DOMA/DD" adtcore:masterLanguage="EN" adtcore:masterSystem="S4H" adtcore:responsible="${SAP_CONFIG.username}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
</doma:domain>`;
      
      const createResponse = await this.client.post(
        createUrl,
        xmlBody,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Accept': 'application/vnd.sap.adt.domains.v1+xml, application/vnd.sap.adt.domains.v2+xml',
            'Content-Type': 'application/vnd.sap.adt.domains.v2+xml'
          }
        }
      );

      log(`[CREATE DOMAIN] Domain created: ${domainName.toUpperCase()}`);

      // Step 3: If data type provided, complete the domain definition
      if (dataType) {
        log(`[CREATE DOMAIN] Completing domain definition with type: ${dataType}`);
        
        // Lock the domain
        const lockResult = await this.lockObject(domainName.toUpperCase(), 'DOMA');
        if (!lockResult.success) {
          throw new Error(`Failed to lock domain: ${lockResult.error}`);
        }
        
        const lockHandle = lockResult.lockHandle;
        
        try {
          // Build complete domain XML with content
          const completeXml = `<?xml version="1.0" encoding="UTF-8"?><doma:domain xmlns:doma="http://www.sap.com/dictionary/domain" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="EN" adtcore:name="${domainName.toUpperCase()}" adtcore:type="DOMA/DD" adtcore:masterLanguage="EN" adtcore:masterSystem="S4H" adtcore:responsible="${SAP_CONFIG.username}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
  <doma:content>
    <doma:typeInformation>
      <doma:datatype>${dataType}</doma:datatype>
      <doma:length>${length || '000010'}</doma:length>
      <doma:decimals>${decimals || '000000'}</doma:decimals>
    </doma:typeInformation>
    <doma:outputInformation>
      <doma:length>000000</doma:length>
      <doma:style>00</doma:style>
      <doma:conversionExit/>
      <doma:signExists>false</doma:signExists>
      <doma:lowercase>false</doma:lowercase>
      <doma:ampmFormat>false</doma:ampmFormat>
    </doma:outputInformation>
    <doma:valueInformation>
      <doma:valueTableRef/>
      <doma:appendExists>false</doma:appendExists>
      <doma:fixValues/>
    </doma:valueInformation>
  </doma:content>
</doma:domain>`;
          
          // Update domain with complete definition
          const updateUrl = `/sap/bc/adt/ddic/domains/${domainName.toLowerCase()}?lockHandle=${lockHandle}`;
          
          await this.client.put(
            updateUrl,
            completeXml,
            {
              headers: {
                'X-CSRF-Token': this.csrfToken,
                'Accept': 'application/vnd.sap.adt.domains.v1+xml, application/vnd.sap.adt.domains.v2+xml',
                'Content-Type': 'application/vnd.sap.adt.domains.v2+xml; charset=utf-8'
              }
            }
          );
          
          log(`[CREATE DOMAIN] Domain definition completed`);
          
          // Unlock the domain
          await this.unlockObject(domainName.toUpperCase(), 'DOMA', lockHandle);
          
          return {
            success: true,
            domainName: domainName.toUpperCase(),
            transportRequest,
            packageName,
            dataType,
            length: length || '10',
            decimals: decimals || '0',
            message: 'Domain created with complete definition',
            httpStatus: createResponse.status
          };
        } catch (error) {
          // Unlock on error
          try {
            await this.unlockObject(domainName.toUpperCase(), 'DOMA', lockHandle);
          } catch (unlockError) {
            log(`[CREATE DOMAIN] Failed to unlock: ${unlockError.message}`);
          }
          throw error;
        }
      }

      return {
        success: true,
        domainName: domainName.toUpperCase(),
        transportRequest,
        packageName,
        message: 'Domain metadata created successfully (use SE11 to define data type)',
        httpStatus: createResponse.status
      };
    } catch (error) {
      log(`[CREATE DOMAIN] FAILED: ${error.message}`);
      log(`[CREATE DOMAIN] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Discover function group for a function module using ADT search
   * GET /sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query={name}*&objectType=FUNC
   */
  async discoverFunctionGroup(functionModuleName) {
    try {
      const searchQuery = `${functionModuleName.toUpperCase()}*`;
      const url = `/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=${encodeURIComponent(searchQuery)}&maxResults=51&objectType=FUNC`;
      log(`[DISCOVER FUNCTION GROUP] Searching for function module: ${url}`);
      
      const response = await this.client.get(url, {
        headers: { 
          'Accept': 'application/xml'
        }
      });

      log(`[DISCOVER FUNCTION GROUP] Response status: ${response.status}`);
      log(`[DISCOVER FUNCTION GROUP] Response data: ${typeof response.data === 'string' ? response.data.substring(0, 500) : JSON.stringify(response.data).substring(0, 500)}`);

      // Parse XML to extract function group from URI
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      });
      const result = parser.parse(response.data);
      
      // Extract URI from search results
      // Expected structure: <adtcore:objectReferences><adtcore:objectReference adtcore:uri="/sap/bc/adt/functions/groups/{fugr}/fmodules/{fm}" .../>
      const objectRef = result?.['adtcore:objectReferences']?.['adtcore:objectReference'];
      
      if (!objectRef) {
        throw new Error(`Function module ${functionModuleName} not found in search results`);
      }
      
      // Handle single result (object) or multiple results (array)
      const firstRef = Array.isArray(objectRef) ? objectRef[0] : objectRef;
      const uri = firstRef?.['@_adtcore:uri'];
      
      if (!uri) {
        throw new Error('Could not extract URI from search results');
      }
      
      log(`[DISCOVER FUNCTION GROUP] Found URI: ${uri}`);
      
      // Extract function group from URI: /sap/bc/adt/functions/groups/{fugr}/fmodules/{fm}
      const match = uri.match(/\/sap\/bc\/adt\/functions\/groups\/([^\/]+)\/fmodules\//);
      if (match && match[1]) {
        const functionGroup = match[1].toUpperCase();
        log(`[DISCOVER FUNCTION GROUP] Extracted function group: ${functionGroup}`);
        return functionGroup;
      }

      throw new Error(`Could not extract function group from URI: ${uri}`);
    } catch (error) {
      log(`[DISCOVER FUNCTION GROUP] FAILED: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read ABAP object source code
   * Finding #1: GET /sap/bc/adt/oo/classes/{name}/source/main
   */
  async readSource(objectName, objectType, functionGroup = null) {
    try {
      // DEBUG: Log which system we're connecting to
      log(`[READ SOURCE] ═══════════════════════════════════════`);
      log(`[READ SOURCE] 🔍 Reading ${objectType} ${objectName}`);
      log(`[READ SOURCE] 📡 Base URL: ${this.client.defaults.baseURL}`);
      log(`[READ SOURCE] 🔐 Auth Mode: ${SAP_CONFIG.authMode}`);
      log(`[READ SOURCE] ═══════════════════════════════════════`);
      
      // For function modules, discover the function group first if not provided
      if ((objectType.toUpperCase() === 'FUNC' || objectType.toUpperCase() === 'FUNCTION_MODULE') && !functionGroup) {
        log(`[READ SOURCE] Function module detected, discovering function group...`);
        functionGroup = await this.discoverFunctionGroup(objectName);
        log(`[READ SOURCE] Discovered function group: ${functionGroup}`);
      }

      const uri = this.buildSourceUri(objectName, objectType, functionGroup);
      
      const response = await this.client.get(uri, {
        headers: { 'Accept': 'text/plain' }
      });

      return {
        success: true,
        source: response.data,
        objectName,
        objectType,
        functionGroup: functionGroup || undefined
      };
    } catch (error) {
      log(`[READ SOURCE] FAILED: ${error.message}`);
      log(`[READ SOURCE] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint || `Could not read source for ${objectType} ${objectName}`,
        rawError: error.response?.data,
        objectName,
        objectType
      };
    }
  }

  /**
   * Create a new ABAP class (metadata only, no source yet)
   * Finding #10: POST /sap/bc/adt/oo/classes?corrNr={transport}
   */
  async createClass(className, description, packageName, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        final = true,
        visibility = 'public',
        language = 'EN',
        masterLanguage = 'EN',
        responsible = SAP_CONFIG.username
      } = options;

      // Build XML request for class creation - matching exact SAP ADT format
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<class:abapClass xmlns:class="http://www.sap.com/adt/oo/classes" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${className.toUpperCase()}" adtcore:type="CLAS/OC" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="S4H" adtcore:responsible="${responsible}" class:final="${final}" class:visibility="${visibility}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
  <class:include adtcore:name="CLAS/OC" adtcore:type="CLAS/OC" class:includeType="testclasses"/>
  <class:superClassRef/>
</class:abapClass>`;

      const response = await this.client.post(
        `/sap/bc/adt/oo/classes?corrNr=${transportRequest}`,
        xmlRequest,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Content-Type': 'application/xml'
          }
        }
      );

      return {
        success: true,
        className: className.toUpperCase(),
        transportRequest,
        packageName,
        message: 'Class metadata created successfully',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[CREATE CLASS] FAILED: ${error.message}`);
      log(`[CREATE CLASS] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Create a new database table (DDIC table)
   * Finding: Eclipse uses "blues" namespace and DDL-style source
   * ADT endpoint: POST /sap/bc/adt/ddic/tables?corrNr={transport}
   */
  async createTable(tableName, description, packageName, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        deliveryClass = 'A',  // A = Application table
        dataClass = 'APPL0',  // Default data class
        sizeCategory = '0'     // Size category
      } = options;

      // Build XML request for table creation - using Eclipse's "blues" namespace!
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?><blue:blueSource xmlns:blue="http://www.sap.com/wbobj/blue" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="EN" adtcore:name="${tableName.toUpperCase()}" adtcore:type="TABL/DT" adtcore:masterLanguage="EN" adtcore:masterSystem="S4H" adtcore:responsible="${SAP_CONFIG.username}">
  <adtcore:packageRef adtcore:name="${packageName}"/>
</blue:blueSource>`;

      // Build URL with optional transport request
      let createUrl = `/sap/bc/adt/ddic/tables`;
      if (transportRequest && transportRequest.trim() !== '') {
        createUrl += `?corrNr=${transportRequest}`;
      }

      const response = await this.client.post(
        createUrl,
        xmlRequest,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Accept': 'application/vnd.sap.adt.blues.v1+xml, application/vnd.sap.adt.tables.v2+xml',
            'Content-Type': 'application/vnd.sap.adt.tables.v2+xml'
          }
        }
      );

      return {
        success: true,
        tableName: tableName.toUpperCase(),
        transportRequest,
        packageName,
        message: 'Table metadata created successfully',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[CREATE TABLE] FAILED: ${error.message}`);
      log(`[CREATE TABLE] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Create a new Package (Development Package)
   * Endpoint: POST /sap/bc/adt/packages?corrNr={transport}
   */
  async createPackage(packageName, description, transportRequest, options = {}) {
    try {
      await this.getCsrfToken();
      
      const {
        language = 'EN',
        masterLanguage = 'EN',
        masterSystem = 'S4H',
        responsible = SAP_CONFIG.username || 'DEVELOPER',
        packageType = 'development', // 'development', 'structure', 'main'
        superPackage = '',
        softwareComponent = 'HOME', // Default to HOME for on-premise systems
        transportLayer = '',
        isEncapsulated = false,
        recordChanges = true
      } = options;

      // Build XML request for package creation
      let xmlRequest = `<?xml version="1.0" encoding="UTF-8"?><pak:package xmlns:pak="http://www.sap.com/adt/packages" xmlns:adtcore="http://www.sap.com/adt/core" adtcore:description="${description}" adtcore:language="${language}" adtcore:name="${packageName.toUpperCase()}" adtcore:type="DEVC/K" adtcore:version="active" adtcore:masterLanguage="${masterLanguage}" adtcore:masterSystem="${masterSystem}" adtcore:responsible="${responsible}">
  <adtcore:packageRef adtcore:name="${packageName.toUpperCase()}"/>
  <pak:attributes pak:isEncapsulated="${isEncapsulated}" pak:packageType="${packageType}" pak:recordChanges="${recordChanges}"/>`;

      // Add super package if provided
      if (superPackage) {
        xmlRequest += `
  <pak:superPackage adtcore:name="${superPackage}"/>`;
      }

      // Add application component (empty for now)
      xmlRequest += `
  <pak:applicationComponent/>`;

      // Add transport information - ALWAYS required by on-premise systems
      // Note: On-premise systems require both softwareComponent AND transportLayer
      xmlRequest += `
  <pak:transport>
    <pak:softwareComponent pak:name="${softwareComponent}"/>
    <pak:transportLayer pak:name="${transportLayer}"/>
  </pak:transport>`;

      // Close the XML
      xmlRequest += `
  <pak:translation/>
  <pak:useAccesses/>
  <pak:packageInterfaces/>
  <pak:subPackages/>
</pak:package>`;

      // Build URL with transport request
      let createUrl = `/sap/bc/adt/packages`;
      if (transportRequest && transportRequest.trim() !== '') {
        createUrl += `?corrNr=${transportRequest}`;
      }

      log(`[CREATE PACKAGE] Creating package: ${packageName.toUpperCase()}`);
      log(`[CREATE PACKAGE] URL: ${createUrl}`);

      const response = await this.client.post(
        createUrl,
        xmlRequest,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Accept': 'application/vnd.sap.adt.packages.v2+xml, application/vnd.sap.adt.packages.v1+xml',
            'Content-Type': 'application/vnd.sap.adt.packages.v2+xml'
          }
        }
      );

      log(`[CREATE PACKAGE] SUCCESS: Package created`);

      return {
        success: true,
        packageName: packageName.toUpperCase(),
        transportRequest,
        superPackage,
        packageType,
        message: 'Package created successfully',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[CREATE PACKAGE] FAILED: ${error.message}`);
      log(`[CREATE PACKAGE] HTTP Status: ${error.response?.status}`);
      log(`[CREATE PACKAGE] Response Data Type: ${typeof error.response?.data}`);
      log(`[CREATE PACKAGE] Response Data: ${JSON.stringify(error.response?.data, null, 2)}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      // Better error message extraction
      let errorMessage = errorDetails.message || error.message;
      
      // If we still have [object Object], try to extract from raw data
      if (errorMessage.includes('[object Object]')) {
        if (typeof error.response?.data === 'string') {
          errorMessage = error.response.data.substring(0, 500);
        } else if (error.response?.data) {
          errorMessage = JSON.stringify(error.response.data, null, 2);
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data,
        fullErrorData: JSON.stringify(error.response?.data, null, 2)
      };
    }
  }

  /**
   * Lock object for modification
   * Finding #5: POST {uri}?_action=LOCK&accessMode=MODIFY
   */
  async lockObject(objectName, objectType) {
    try {
      await this.getCsrfToken();
      
      const uri = this.buildObjectUri(objectName, objectType);
      const lockUrl = `${uri}?_action=LOCK&accessMode=MODIFY`;

      log(`[LOCK] Attempting to lock: ${lockUrl}`);
      log(`[LOCK] CSRF Token: ${this.csrfToken ? 'Present' : 'MISSING'}`);

      const response = await this.client.post(lockUrl, '', {
        headers: {
          'X-CSRF-Token': this.csrfToken,
          'Content-Type': 'application/xml',
          'Accept': 'application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9',
          'X-sap-adt-profiling': 'server-time',
          'X-sap-adt-sessiontype': 'stateful'
        }
      });

      log(`[LOCK] Response status: ${response.status}`);
      log(`[LOCK] Response data length: ${response.data?.length || 0}`);

      // Parse XML response to extract lock handle and transport
      const lockData = xmlParser.parse(response.data);
      const data = lockData['asx:abap']['asx:values'].DATA;

      log(`[LOCK] Lock Handle: ${data.LOCK_HANDLE}`);
      log(`[LOCK] Transport: ${data.CORRNR}`);
      log(`[LOCK] Modification Support: ${data.MODIFICATION_SUPPORT}`);

      return {
        success: true,
        lockHandle: data.LOCK_HANDLE,
        transportRequest: data.CORRNR,
        transportUser: data.CORRUSER,
        transportText: data.CORRTEXT,
        modificationSupport: data.MODIFICATION_SUPPORT,
        rawResponse: response.data
      };
    } catch (error) {
      log(`[LOCK] FAILED: ${error.message}`);
      log(`[LOCK] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Save ABAP object source code
   * Finding #6: PUT {uri}/source/main?lockHandle={handle}&corrNr={transport}
   */
  async saveSource(objectName, objectType, sourceCode, lockHandle, transportRequest) {
    try {
      const uri = this.buildSourceUri(objectName, objectType);
      // Build URL with or without corrNr depending on whether we have a transport
      let saveUrl = `${uri}?lockHandle=${encodeURIComponent(lockHandle)}`;
      if (transportRequest && transportRequest.trim() !== '') {
        saveUrl += `&corrNr=${transportRequest}`;
      }

      log(`[SAVE] Attempting to save: ${saveUrl}`);
      log(`[SAVE] Lock Handle: ${lockHandle}`);
      log(`[SAVE] Transport: ${transportRequest}`);
      log(`[SAVE] CSRF Token: ${this.csrfToken ? 'Present' : 'MISSING'}`);
      log(`[SAVE] Source code length: ${sourceCode?.length || 0}`);

      const response = await this.client.put(saveUrl, sourceCode, {
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'text/plain; charset=utf-8',
          'X-sap-adt-profiling': 'server-time',
          'X-CSRF-Token': this.csrfToken,
          'X-sap-adt-sessiontype': 'stateful'
        }
      });

      log(`[SAVE] SUCCESS: Response status ${response.status}`);

      return {
        success: true,
        message: 'Source code saved successfully',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[SAVE] FAILED: ${error.message}`);
      log(`[SAVE] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data,
        requestUrl: `${this.client.defaults.baseURL}${error.config?.url}`,
        lockHandle: lockHandle,
        transport: transportRequest
      };
    }
  }

  /**
   * Save test class include source code
   * PUT {uri}/includes/testclasses?lockHandle={handle}&corrNr={transport}
   */
  async saveTestClassInclude(objectName, sourceCode, lockHandle, transportRequest) {
    try {
      const uri = this.buildObjectUri(objectName, 'CLAS');
      let saveUrl = `${uri}/includes/testclasses?lockHandle=${encodeURIComponent(lockHandle)}`;
      if (transportRequest && transportRequest.trim() !== '') {
        saveUrl += `&corrNr=${transportRequest}`;
      }

      log(`[SAVE TEST CLASS] Attempting to save: ${saveUrl}`);
      log(`[SAVE TEST CLASS] Lock Handle: ${lockHandle}`);
      log(`[SAVE TEST CLASS] Transport: ${transportRequest}`);
      log(`[SAVE TEST CLASS] Source code length: ${sourceCode?.length || 0}`);

      const response = await this.client.put(saveUrl, sourceCode, {
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'text/plain; charset=utf-8',
          'X-sap-adt-profiling': 'server-time',
          'X-CSRF-Token': this.csrfToken,
          'X-sap-adt-sessiontype': 'stateful'
        }
      });

      log(`[SAVE TEST CLASS] SUCCESS: Response status ${response.status}`);

      return {
        success: true,
        message: 'Test class source code saved successfully',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[SAVE TEST CLASS] FAILED: ${error.message}`);
      log(`[SAVE TEST CLASS] HTTP Status: ${error.response?.status}`);
      
      return {
        success: false,
        error: error.message,
        httpStatus: error.response?.status,
        details: error.response?.data,
        requestUrl: `${this.client.defaults.baseURL}${error.config?.url}`,
        lockHandle: lockHandle,
        transport: transportRequest
      };
    }
  }

  async readTestClassInclude(objectName) {
    try {
      await this.getCsrfToken();
      
      const uri = this.buildObjectUri(objectName, 'CLAS');
      const readUrl = `${uri}/includes/testclasses`;

      log(`[READ TEST CLASS] Reading: ${readUrl}`);

      const response = await this.client.get(readUrl, {
        headers: {
          'Accept': 'text/plain',
          'X-CSRF-Token': this.csrfToken,
          'X-sap-adt-sessiontype': 'stateful'
        }
      });

      log(`[READ TEST CLASS] SUCCESS: Response status ${response.status}, length ${response.data?.length || 0}`);

      return {
        success: true,
        sourceCode: response.data,
        httpStatus: response.status
      };
    } catch (error) {
      log(`[READ TEST CLASS] FAILED: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        httpStatus: error.response?.status,
        details: error.response?.data
      };
    }
  }

  /**
   * Read local implementations (handler/saver classes) from a class
   * Endpoint: GET /sap/bc/adt/oo/classes/{name}/includes/implementations
   */
  async readLocalImplementations(className) {
    try {
      await this.getCsrfToken();
      
      const uri = this.buildObjectUri(className, 'CLAS');
      const readUrl = `${uri}/includes/implementations`;
      
      log(`[READ LOCAL IMPL] Reading from: ${readUrl}`);
      
      const response = await this.client.get(readUrl, {
        headers: {
          'Accept': 'text/plain',
          'X-CSRF-Token': this.csrfToken,
          'X-sap-adt-sessiontype': 'stateful'
        }
      });
      
      log(`[READ LOCAL IMPL] SUCCESS: ${response.data?.length || 0} characters read`);
      
      return {
        success: true,
        className: className.toUpperCase(),
        sourceCode: response.data,
        length: response.data?.length || 0
      };
      
    } catch (error) {
      log(`[READ LOCAL IMPL] FAILED: ${error.message}`);
      log(`[READ LOCAL IMPL] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint || 'Class may not exist, may not have local implementations, or you may not have read authorization'
      };
    }
  }

  async saveLocalImplementations(objectName, sourceCode, lockHandle, transportRequest) {
    try {
      const uri = this.buildObjectUri(objectName, 'CLAS');
      let saveUrl = `${uri}/includes/implementations?lockHandle=${encodeURIComponent(lockHandle)}`;
      if (transportRequest && transportRequest.trim() !== '') {
        saveUrl += `&corrNr=${transportRequest}`;
      }

      log(`[SAVE LOCAL IMPL] Attempting to save: ${saveUrl}`);
      log(`[SAVE LOCAL IMPL] Lock Handle: ${lockHandle}`);
      log(`[SAVE LOCAL IMPL] Transport: ${transportRequest}`);
      log(`[SAVE LOCAL IMPL] Source code length: ${sourceCode?.length || 0}`);

      const response = await this.client.put(saveUrl, sourceCode, {
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'text/plain; charset=utf-8',
          'X-sap-adt-profiling': 'server-time',
          'X-CSRF-Token': this.csrfToken,
          'X-sap-adt-sessiontype': 'stateful'
        }
      });

      log(`[SAVE LOCAL IMPL] SUCCESS: Response status ${response.status}`);

      return {
        success: true,
        message: 'Local implementations saved successfully',
        httpStatus: response.status
      };
    } catch (error) {
      log(`[SAVE LOCAL IMPL] FAILED: ${error.message}`);
      log(`[SAVE LOCAL IMPL] HTTP Status: ${error.response?.status}`);
      
      return {
        success: false,
        error: error.message,
        httpStatus: error.response?.status,
        details: error.response?.data,
        requestUrl: `${this.client.defaults.baseURL}${error.config?.url}`,
        lockHandle: lockHandle,
        transport: transportRequest
      };
    }
  }

  /**
   * Run unit tests for an object
   * POST /sap/bc/adt/abapunit/testruns
   */
  async runUnitTests(objectName, objectType) {
    try {
      await this.getCsrfToken();
      
      const uri = this.buildObjectUri(objectName, objectType);
      const runUrl = '/sap/bc/adt/abapunit/testruns';

      // Build XML configuration for test run
      const testConfig = `<?xml version="1.0" encoding="UTF-8"?><aunit:runConfiguration xmlns:aunit="http://www.sap.com/adt/aunit">
  <external>
    <coverage active="false"/>
  </external>
  <options>
    <uriType value="semantic"/>
    <testDeterminationStrategy sameProgram="true" assignedTests="false" appendAssignedTestsPreview="true"/>
    <testRiskLevels harmless="true" dangerous="true" critical="true"/>
    <testDurations short="true" medium="true" long="true"/>
    <withNavigationUri enabled="false"/>
  </options>
  <adtcore:objectSets xmlns:adtcore="http://www.sap.com/adt/core">
    <objectSet kind="inclusive">
      <adtcore:objectReferences>
        <adtcore:objectReference adtcore:uri="${uri}"/>
      </adtcore:objectReferences>
    </objectSet>
  </adtcore:objectSets>
</aunit:runConfiguration>`;

      log(`[RUN TESTS] Running tests for: ${uri}`);

      const response = await this.client.post(runUrl, testConfig, {
        headers: {
          'X-CSRF-Token': this.csrfToken,
          'Content-Type': 'application/vnd.sap.adt.abapunit.testruns.config.v4+xml',
          'Accept': 'application/vnd.sap.adt.abapunit.testruns.result.v2+xml',
          'X-sap-adt-sessiontype': 'stateful'
        }
      });

      log(`[RUN TESTS] SUCCESS: Response status ${response.status}`);

      // Parse XML response
      const result = xmlParser.parse(response.data);

      return {
        success: true,
        rawXml: response.data,
        parsed: result
      };
    } catch (error) {
      log(`[RUN TESTS] FAILED: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        httpStatus: error.response?.status,
        details: error.response?.data
      };
    }
  }

  /**
   * Execute runnable class (F9 functionality)
   * POST /sap/bc/adt/oo/classrun/{CLASS_NAME}
   * Returns plain text output from if_oo_adt_classrun~main method
   * Note: Class name must be uppercase in the URL, even though other endpoints use lowercase
   */
  async executeClass(className) {
    try {
      await this.getCsrfToken();
      
      // The classrun endpoint uses UPPERCASE class name (different from other endpoints)
      // Format: /sap/bc/adt/oo/classrun/{UPPERCASE_CLASS_NAME}
      // IMPORTANT: URL-encode the class name to handle namespaces (e.g., /NAMESPACE/CLASS)
      const encodedClassName = encodeURIComponent(className.toUpperCase());
      const executeUrl = `/sap/bc/adt/oo/classrun/${encodedClassName}`;

      log(`[EXECUTE CLASS] Running F9 for: ${className}`);
      log(`[EXECUTE CLASS] Execute URL: ${executeUrl}`);

      const response = await this.client.post(executeUrl, '', {
        headers: {
          'X-CSRF-Token': this.csrfToken,
          'Accept': 'text/plain',
          'X-sap-adt-sessiontype': 'stateful'
        }
      });

      log(`[EXECUTE CLASS] Response status ${response.status}`);
      log(`[EXECUTE CLASS] Output: ${response.data}`);

      // Check if the output contains an error message
      // SAP returns HTTP 200 but puts error messages in the output
      const output = response.data || '';
      const hasError = output.includes('Error:') || 
                       output.includes('does not implement') ||
                       output.includes('Exception') ||
                       output.includes('ABAP runtime error');

      if (hasError) {
        log(`[EXECUTE CLASS] FAILED: Error detected in output`);
        return {
          success: false,
          error: 'Class execution failed',
          output: output,
          className: className.toUpperCase(),
          hint: 'Check that the class implements if_oo_adt_classrun~main, is activated, and has no runtime errors'
        };
      }

      log(`[EXECUTE CLASS] SUCCESS: Class executed without errors`);

      return {
        success: true,
        output: output,
        className: className.toUpperCase()
      };
    } catch (error) {
      log(`[EXECUTE CLASS] FAILED: ${error.message}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint || 'Ensure the class implements if_oo_adt_classrun~main and is activated',
        rawError: error.response?.data
      };
    }
  }

  /**
   * Unlock object
   * Finding #7: POST {uri}?_action=UNLOCK&lockHandle={handle}
   * Note: If lockHandle is null, tries to unlock without lockHandle (may work if user owns the lock)
   */
  async unlockObject(objectName, objectType, lockHandle) {
    try {
      await this.getCsrfToken();
      
      const uri = this.buildObjectUri(objectName, objectType);
      // If lockHandle is provided, use it; otherwise try without it (for standalone unlock)
      const unlockUrl = lockHandle 
        ? `${uri}?_action=UNLOCK&lockHandle=${encodeURIComponent(lockHandle)}`
        : `${uri}?_action=UNLOCK`;

      log(`[UNLOCK] Attempting to unlock: ${objectType} ${objectName}${lockHandle ? ` with lockHandle` : ' without lockHandle'}`);

      await this.client.post(unlockUrl, '', {
        headers: {
          'X-CSRF-Token': this.csrfToken,
          'X-sap-adt-sessiontype': 'stateful'
        }
      });

      log(`[UNLOCK] SUCCESS: ${objectType} ${objectName}`);

      return {
        success: true,
        message: 'Object unlocked successfully'
      };
    } catch (error) {
      log(`[UNLOCK] FAILED: ${error.message}`);
      log(`[UNLOCK] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  async removeObjectsFromTransport(transportNumber, objects) {
    try {
      await this.getCsrfToken();
      
      log(`[REMOVE FROM TRANSPORT] Removing ${objects.length} object(s) from transport: ${transportNumber}`);
      
      // Build the XML for each object
      const xmlBuilder = new XMLBuilder({
        ignoreAttributes: false,
        format: true,
        suppressEmptyNode: true
      });
      
      // Iterate through objects and remove them one by one
      const results = [];
      for (const obj of objects) {
        try {
          log(`[REMOVE FROM TRANSPORT] Removing object: ${obj.name} (${obj.type}/${obj.pgmid || 'R3TR'})`);
          
          // Build XML for this object
          const abapObject = {
            '@_tm:name': obj.name,
            '@_tm:pgmid': obj.pgmid || 'R3TR',
            '@_tm:type': obj.type
          };
          
          // Only include obj_desc if provided
          if (obj.obj_desc) {
            abapObject['@_tm:obj_desc'] = obj.obj_desc;
          }
          
          // Only include position if provided
          if (obj.position) {
            abapObject['@_tm:position'] = obj.position;
          }
          
          const xmlData = {
            'tm:root': {
              '@_xmlns:tm': 'http://www.sap.com/cts/adt/tm',
              '@_tm:number': transportNumber,
              '@_tm:useraction': 'removeobject',
              'tm:request': {
                'tm:abap_object': abapObject
              }
            }
          };
          
          const xmlBody = '<?xml version="1.0" encoding="ASCII"?>\n' + xmlBuilder.build(xmlData);
          
          log(`[REMOVE FROM TRANSPORT] XML Body: ${xmlBody}`);
          
          // Make PUT request to remove the object
          const url = `/sap/bc/adt/cts/transportrequests/${transportNumber}`;
          
          const response = await this.client.put(url, xmlBody, {
            headers: {
              'Accept': 'application/vnd.sap.adt.transportorganizer.v1+xml',
              'Content-Type': 'text/plain',
              'X-CSRF-Token': this.csrfToken,
              'X-sap-adt-sessiontype': 'stateful'
            }
          });
          
          log(`[REMOVE FROM TRANSPORT] Object ${obj.name} removed successfully. Status: ${response.status}`);
          
          results.push({
            object: obj.name,
            success: true,
            status: response.status
          });
          
        } catch (error) {
          log(`[REMOVE FROM TRANSPORT] FAILED for object ${obj.name}: ${error.message}`);
          log(`[REMOVE FROM TRANSPORT] HTTP Status: ${error.response?.status}`);
          
          const errorDetails = parseAdtError(error.response?.data || error.message);
          
          results.push({
            object: obj.name,
            success: false,
            error: errorDetails.message || error.message,
            httpStatus: error.response?.status,
            details: errorDetails.details
          });
        }
      }
      
      // Check if all succeeded
      const allSucceeded = results.every(r => r.success);
      const successCount = results.filter(r => r.success).length;
      
      return {
        success: allSucceeded,
        message: allSucceeded 
          ? `All ${successCount} object(s) removed successfully from transport ${transportNumber}`
          : `${successCount} out of ${results.length} object(s) removed successfully`,
        transportNumber,
        results
      };
      
    } catch (error) {
      log(`[REMOVE FROM TRANSPORT] FAILED: ${error.message}`);
      log(`[REMOVE FROM TRANSPORT] HTTP Status: ${error.response?.status}`);
      log(`[REMOVE FROM TRANSPORT] Response Data: ${JSON.stringify(error.response?.data)}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message || 'Unknown error occurred',
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Check syntax of unsaved source code (in-memory check)
   * This sends the source code directly for validation without saving
   * Source is sent as Base64-encoded content in artifacts structure
   * Format confirmed from ADT Communication Log
   */
  async checkSyntaxUnsaved(objectName, objectType, sourceCode) {
    try {
      const objectUri = this.buildObjectUri(objectName, objectType);
      const sourceUri = this.buildSourceUri(objectName, objectType);
      
      // Encode source code to Base64
      const base64Source = Buffer.from(sourceCode, 'utf-8').toString('base64');
      
      // Build XML request with artifacts structure (confirmed ADT format)
      const checkRequest = {
        'chkrun:checkObjectList': {
          '@_xmlns:chkrun': 'http://www.sap.com/adt/checkrun',
          '@_xmlns:adtcore': 'http://www.sap.com/adt/core',
          'chkrun:checkObject': {
            '@_adtcore:uri': objectUri,
            '@_chkrun:version': 'inactive',
            'chkrun:artifacts': {
              'chkrun:artifact': {
                '@_chkrun:contentType': 'text/plain; charset=utf-8',
                '@_chkrun:uri': sourceUri,
                'chkrun:content': base64Source
              }
            }
          }
        }
      };

      const xmlRequest = xmlBuilder.build(checkRequest);

      await this.getCsrfToken();
      
      const response = await this.client.post(
        '/sap/bc/adt/checkruns?reporters=abapCheckRun',
        `<?xml version="1.0" encoding="UTF-8"?>\n${xmlRequest}`,
        {
          headers: { 
            'Content-Type': 'application/vnd.sap.adt.checkobjects+xml',
            'Accept': 'application/xml',
            'X-CSRF-Token': this.csrfToken,
            'X-sap-adt-sessiontype': 'stateful'
          }
        }
      );

      // Parse XML response (same format as saved syntax check)
      const checkResult = xmlParser.parse(response.data);
      const report = checkResult['chkrun:checkRunReports']['chkrun:checkReport'];

      const messages = [];
      const messageList = report['chkrun:checkMessageList'];
      
      if (messageList && messageList['chkrun:checkMessage']) {
        const msgs = Array.isArray(messageList['chkrun:checkMessage']) 
          ? messageList['chkrun:checkMessage']
          : [messageList['chkrun:checkMessage']];

        for (const msg of msgs) {
          // Extract line and column from URI if present
          let line = null, column = null;
          if (msg['@_chkrun:uri'] && msg['@_chkrun:uri'].includes('#start=')) {
            const match = msg['@_chkrun:uri'].match(/#start=(\d+),(\d+)/);
            if (match) {
              line = parseInt(match[1]);
              column = parseInt(match[2]);
            }
          }

          messages.push({
            type: msg['@_chkrun:type'],
            text: msg['@_chkrun:shortText'],
            line,
            column,
            uri: msg['@_chkrun:uri']
          });
        }
      }

      const hasErrors = messages.some(m => m.type === 'E');

      return {
        success: true,
        status: report['@_chkrun:status'],
        statusText: report['@_chkrun:statusText'],
        hasErrors,
        messages,
        objectName,
        objectType,
        checked: 'unsaved'
      };
    } catch (error) {
      // If inline source check not supported, return helpful error
      if (error.response?.status === 400 || error.response?.status === 415) {
        return {
          success: false,
          error: 'Unsaved syntax check may not be supported by this SAP system or ADT version. Use save+check workflow instead.',
          httpStatus: error.response?.status,
          details: error.response?.data,
          fallbackRequired: true
        };
      }
      
      log(`[CHECK SYNTAX UNSAVED] FAILED: ${error.message}`);
      log(`[CHECK SYNTAX UNSAVED] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Check syntax of saved object
   * Finding #4: POST /sap/bc/adt/checkruns?reporters=abapCheckRun
   */
  async checkSyntax(objectName, objectType, version = 'inactive') {
    try {
      const uri = this.buildObjectUri(objectName, objectType);
      
      // Build XML request
      const checkRequest = {
        'chkrun:checkObjectList': {
          '@_xmlns:chkrun': 'http://www.sap.com/adt/checkrun',
          '@_xmlns:adtcore': 'http://www.sap.com/adt/core',
          'chkrun:checkObject': {
            '@_adtcore:uri': uri,
            '@_chkrun:version': version
          }
        }
      };

      const xmlRequest = xmlBuilder.build(checkRequest);

      await this.getCsrfToken();

      const response = await this.client.post(
        '/sap/bc/adt/checkruns?reporters=abapCheckRun',
        `<?xml version="1.0" encoding="UTF-8"?>\n${xmlRequest}`,
        {
          headers: { 
            'Content-Type': 'application/vnd.sap.adt.checkobjects+xml',
            'X-CSRF-Token': this.csrfToken,
            'X-sap-adt-sessiontype': 'stateful'
          }
        }
      );

      // Parse XML response
      const checkResult = xmlParser.parse(response.data);
      const report = checkResult['chkrun:checkRunReports']['chkrun:checkReport'];

      const messages = [];
      const messageList = report['chkrun:checkMessageList'];
      
      if (messageList && messageList['chkrun:checkMessage']) {
        const msgs = Array.isArray(messageList['chkrun:checkMessage']) 
          ? messageList['chkrun:checkMessage']
          : [messageList['chkrun:checkMessage']];

        for (const msg of msgs) {
          // Extract line and column from URI if present
          let line = null, column = null;
          if (msg['@_chkrun:uri'] && msg['@_chkrun:uri'].includes('#start=')) {
            const match = msg['@_chkrun:uri'].match(/#start=(\d+),(\d+)/);
            if (match) {
              line = parseInt(match[1]);
              column = parseInt(match[2]);
            }
          }

          messages.push({
            type: msg['@_chkrun:type'],
            text: msg['@_chkrun:shortText'],
            line,
            column,
            uri: msg['@_chkrun:uri']
          });
        }
      }

      const hasErrors = messages.some(m => m.type === 'E');

      return {
        success: true,
        status: report['@_chkrun:status'],
        statusText: report['@_chkrun:statusText'],
        hasErrors,
        messages,
        objectName,
        objectType
      };
    } catch (error) {
      log(`[CHECK SYNTAX] FAILED: ${error.message}`);
      log(`[CHECK SYNTAX] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Activate objects
   * Finding #8: POST /sap/bc/adt/activation?method=activate&preauditRequested=true
   */
  async activateObjects(objects) {
    try {
      await this.getCsrfToken();

      // Build object references list
      const objectRefs = objects.map(obj => ({
        '@_adtcore:uri': this.buildObjectUri(obj.name, obj.type),
        '@_adtcore:name': obj.name.toUpperCase()
      }));

      const activationRequest = {
        'adtcore:objectReferences': {
          '@_xmlns:adtcore': 'http://www.sap.com/adt/core',
          'adtcore:objectReference': objectRefs
        }
      };

      const xmlRequest = xmlBuilder.build(activationRequest);
      
      const fullXml = `<?xml version="1.0" encoding="UTF-8"?>\n${xmlRequest}`;
      log(`[ACTIVATE] Sending XML:\n${fullXml}`);

      const response = await this.client.post(
        '/sap/bc/adt/activation?method=activate&preauditRequested=true',
        fullXml,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Content-Type': 'application/xml',
            'X-sap-adt-sessiontype': 'stateful'
          }
        }
      );

      // Parse XML response
      const activationResult = xmlParser.parse(response.data);
      const messages = activationResult['chkl:messages'];
      const properties = messages['chkl:properties'];

      log(`[ACTIVATE] Properties: ${JSON.stringify(properties)}`);

      const activated = properties['@_activationExecuted'] === true || properties['@_activationExecuted'] === 'true';
      const checkExecuted = properties['@_checkExecuted'] === true || properties['@_checkExecuted'] === 'true';
      const generationExecuted = properties['@_generationExecuted'] === true || properties['@_generationExecuted'] === 'true';
      
      log(`[ACTIVATE] Parsed: activated=${activated}, checkExecuted=${checkExecuted}, generationExecuted=${generationExecuted}`);

      // Parse error messages if any
      const errorMessages = [];
      if (messages.msg) {
        const msgs = Array.isArray(messages.msg) ? messages.msg : [messages.msg];
        
        for (const msg of msgs) {
          errorMessages.push({
            type: msg['@_type'],
            line: msg['@_line'],
            objectDescription: msg['@_objDescr'],
            text: Array.isArray(msg.shortText?.txt) 
              ? msg.shortText.txt.join(' ')
              : msg.shortText?.txt || '',
            href: msg['@_href']
          });
        }
      }

      // Success for regular objects = activated
      // Success for service bindings = generationExecuted
      const isSuccess = activated || (generationExecuted && objects.some(obj => obj.type === 'SRVB' || obj.type === 'SERVICE_BINDING'));
      
      return {
        success: isSuccess,
        activated,
        checkExecuted,
        generationExecuted,
        messages: errorMessages,
        objectCount: objects.length
      };
    } catch (error) {
      log(`[ACTIVATE] FAILED: ${error.message}`);
      log(`[ACTIVATE] HTTP Status: ${error.response?.status}`);
      
      const errorDetails = parseAdtError(error.response?.data || error.message);
      
      return {
        success: false,
        error: errorDetails.message || error.message,
        httpStatus: error.response?.status,
        details: errorDetails.details,
        hint: errorDetails.hint,
        rawError: error.response?.data
      };
    }
  }

  /**
   * Complete workflow: Lock → Save → Unlock → Syntax Check → Activate
   * Note: Unlock happens BEFORE activate (ADT standard flow)
   */
  async updateAndActivate(objectName, objectType, sourceCode) {
    const results = {
      steps: [],
      success: false
    };

    let lockHandle = null;
    let transportRequest = null;

    try {
      // Step 0: Get CSRF token FIRST (before lock, so session is established)
      await this.getCsrfToken();
      
      // Step 1: Lock
      const lockResult = await this.lockObject(objectName, objectType);
      results.steps.push({ step: 'lock', result: lockResult });
      
      if (!lockResult.success) {
        throw new Error(`Lock failed: ${lockResult.error}`);
      }
      
      lockHandle = lockResult.lockHandle;
      transportRequest = lockResult.transportRequest;

      // Step 2: Save
      const saveResult = await this.saveSource(
        objectName, 
        objectType, 
        sourceCode, 
        lockHandle, 
        transportRequest
      );
      results.steps.push({ step: 'save', result: saveResult });
      
      if (!saveResult.success) {
        throw new Error(`Save failed: ${saveResult.error}`);
      }

      // Step 3: Unlock (ADT unlocks BEFORE activate, not after!)
      const unlockResult = await this.unlockObject(objectName, objectType, lockHandle);
      results.steps.push({ step: 'unlock', result: unlockResult });
      lockHandle = null; // Mark as unlocked
      
      if (!unlockResult.success) {
        throw new Error(`Unlock failed: ${unlockResult.error}`);
      }

      // Step 4: Syntax Check
      const syntaxResult = await this.checkSyntax(objectName, objectType, 'inactive');
      results.steps.push({ step: 'syntax_check', result: syntaxResult });
      
      if (!syntaxResult.success) {
        throw new Error(`Syntax check failed: ${syntaxResult.error}`);
      }

      if (syntaxResult.hasErrors) {
        results.success = false;
        results.error = 'Syntax errors found. Cannot activate.';
        return results;
      }

      // Step 5: Activate (object is already unlocked)
      const activationResult = await this.activateObjects([
        { name: objectName, type: objectType }
      ]);
      results.steps.push({ step: 'activate', result: activationResult });
      
      if (!activationResult.success) {
        throw new Error(`Activation failed: ${activationResult.error}`);
      }

      results.success = true;
      return results;

    } catch (error) {
      results.success = false;
      results.error = error.message;
      
      // If we still have a lock and error occurred before unlock, unlock in finally
      if (lockHandle) {
        try {
          const unlockResult = await this.unlockObject(objectName, objectType, lockHandle);
          results.steps.push({ step: 'unlock', result: unlockResult });
        } catch (unlockError) {
          // Unlock failed, but we're already in error state
        }
      }
      
      return results;
    }
  }

  /**
   * Where-used list: Find where an object is being used
   * @param {string} objectName - Name of the object (e.g., ZCL_MY_CLASS)
   * @param {string} objectType - Object type (CLAS, INTF, PROG, DDLS, etc.)
   * @returns {Promise<object>} - List of references
   */
  async whereUsedList(objectName, objectType) {
    try {
      await this.getCsrfToken();

      // Build object URI
      const objectUri = this.buildObjectUri(objectName, objectType);
      const encodedUri = encodeURIComponent(objectUri);

      log(`WHERE-USED: Finding references for ${objectType} ${objectName} (URI: ${objectUri})`);

      // Request body - empty affectedObjects
      const requestBody = `<?xml version="1.0" encoding="UTF-8"?><usagereferences:usageReferenceRequest xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences">
  <usagereferences:affectedObjects/>
</usagereferences:usageReferenceRequest>`;

      const response = await this.client.post(
        `/sap/bc/adt/repository/informationsystem/usageReferences?uri=${encodedUri}`,
        requestBody,
        {
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'Accept': 'application/vnd.sap.adt.repository.usagereferences.result.v1+xml',
            'Content-Type': 'application/vnd.sap.adt.repository.usagereferences.request.v1+xml'
          }
        }
      );

      log(`WHERE-USED: Response status ${response.status}`);

      // Parse XML response
      const parsedResponse = xmlParser.parse(response.data);
      const result = parsedResponse['usageReferences:usageReferenceResult'];

      if (!result) {
        return {
          success: false,
          error: 'Invalid response format from SAP',
          numberOfResults: 0,
          references: []
        };
      }

      // Extract metadata
      const numberOfResults = parseInt(result['@_numberOfResults'] || '0', 10);
      const resultDescription = result['@_resultDescription'] || '';

      // Extract referenced objects
      const references = [];
      const referencedObjects = result['usageReferences:referencedObjects'];
      
      if (referencedObjects && referencedObjects['usageReferences:referencedObject']) {
        const refObjects = Array.isArray(referencedObjects['usageReferences:referencedObject'])
          ? referencedObjects['usageReferences:referencedObject']
          : [referencedObjects['usageReferences:referencedObject']];

        for (const ref of refObjects) {
          const adtObject = ref['usageReferences:adtObject'];
          
          references.push({
            uri: ref['@_uri'],
            parentUri: ref['@_parentUri'],
            isResult: ref['@_isResult'] === 'true',
            canHaveChildren: ref['@_canHaveChildren'] === 'true',
            usageInformation: ref['@_usageInformation'],
            name: adtObject ? adtObject['@_adtcore:name'] : null,
            type: adtObject ? adtObject['@_adtcore:type'] : null,
            packageName: adtObject && adtObject['adtcore:packageRef'] 
              ? adtObject['adtcore:packageRef']['@_adtcore:name'] 
              : null,
            description: adtObject ? adtObject['@_adtcore:description'] : null
          });
        }
      }

      log(`WHERE-USED: Found ${numberOfResults} references`);

      return {
        success: true,
        numberOfResults,
        resultDescription,
        references
      };

    } catch (error) {
      log(`WHERE-USED ERROR: ${error.message}`);
      
      const errorInfo = parseAdtError(error.response?.data);
      return {
        success: false,
        error: errorInfo.message || error.message,
        details: errorInfo.details,
        hint: errorInfo.hint,
        numberOfResults: 0,
        references: []
      };
    }
  }

  /**
   * Reassign object to a new package (refactoring operation)
   * POST /sap/bc/adt/refactorings?step=execute
   */
  async reassignPackage(objectName, objectType, currentPackage, newPackage, transportRequest, description = '') {
    try {
      await this.getCsrfToken();
      
      log(`[REASSIGN PACKAGE] Object: ${objectName}, Type: ${objectType}`);
      log(`[REASSIGN PACKAGE] From package: ${currentPackage} -> To package: ${newPackage}`);
      log(`[REASSIGN PACKAGE] Transport: ${transportRequest}`);

      // Build the base object URI (without /source/main suffix)
      // Note: buildObjectUri already URL-encodes the object name
      const objectUri = this.buildObjectUri(objectName, objectType);

      // Map object types to ADT core types
      const adtTypeMap = {
        'CLAS': 'CLAS/OC',
        'INTF': 'INTF/OI',
        'PROG': 'PROG/P',
        'DDLS': 'DDLS/DF',
        'BDEF': 'BDEF/BDO',
        'TABL': 'TABL/DT',
        'TTYP': 'TTYP/DA',
        'DTEL': 'DTEL/DE',
        'DOMA': 'DOMA/DO',
        'STRUCT': 'TABL/DS',
        'SUSH': 'SUSH',
        'SCO3': 'SCO3'
      };

      const adtCoreType = adtTypeMap[objectType] || objectType;
      
      // Use provided description or generate a default one
      const objectDescription = description || `${objectType} ${objectName}`;

      // Build XML body for refactoring request (match Eclipse ADT format exactly)
      const xmlBody = `<?xml version="1.0" encoding="ASCII"?>
<generic:genericRefactoring xmlns:adtcore="http://www.sap.com/adt/core" xmlns:generic="http://www.sap.com/adt/refactoring/genericrefactoring">
  <generic:title>Change Package Assignment of ${objectName}</generic:title>
  <generic:adtObjectUri>${objectUri}</generic:adtObjectUri>
  <generic:affectedObjects>
    <generic:affectedObject adtcore:description="${objectDescription}" adtcore:name="${objectName}" adtcore:packageName="${currentPackage}" adtcore:type="${adtCoreType}" adtcore:uri="${objectUri}">
      <generic:userContent></generic:userContent>
      <generic:changePackageDelta>
        <generic:newPackage>${newPackage}</generic:newPackage>
      </generic:changePackageDelta>
    </generic:affectedObject>
  </generic:affectedObjects>
  <generic:transport>${transportRequest}</generic:transport>
  <generic:ignoreSyntaxErrorsAllowed>false</generic:ignoreSyntaxErrorsAllowed>
  <generic:ignoreSyntaxErrors>false</generic:ignoreSyntaxErrors>
  <generic:userContent></generic:userContent>
</generic:genericRefactoring>`;

      log(`[REASSIGN PACKAGE] XML Body:\n${xmlBody}`);

      const response = await this.client.post(
        '/sap/bc/adt/refactorings?step=execute',
        xmlBody,
        {
          headers: {
            'Accept': 'application/xml',
            'Content-Type': 'text/plain',
            'X-sap-adt-profiling': 'server-time',
            'X-CSRF-Token': this.csrfToken,
            'X-sap-adt-sessiontype': 'stateful',
            'accept-encoding': 'gzip',
            'sap-cancel-on-close': 'true',
            'sap-adt-saplb': 'fetch'
          }
        }
      );

      log(`[REASSIGN PACKAGE] SUCCESS: Response status ${response.status}`);

      return {
        success: true,
        message: `Successfully reassigned ${objectName} from package ${currentPackage} to ${newPackage}`,
        objectName,
        objectType,
        oldPackage: currentPackage,
        newPackage,
        transportRequest,
        httpStatus: response.status
      };

    } catch (error) {
      log(`[REASSIGN PACKAGE] ERROR: ${error.message}`);
      log(`[REASSIGN PACKAGE] HTTP Status: ${error.response?.status}`);
      log(`[REASSIGN PACKAGE] Response Data: ${JSON.stringify(error.response?.data)}`);
      
      const errorInfo = parseAdtError(error.response?.data);
      
      return {
        success: false,
        error: errorInfo.message || error.message,
        details: errorInfo.details,
        hint: errorInfo.hint,
        httpStatus: error.response?.status,
        rawError: error.response?.data,
        objectName,
        objectType
      };
    }
  }
}

// Initialize ADT service
const adtService = new AdtService();

// Create MCP server
const server = new Server(
  {
    name: 'abap-adt-service',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'adt_create_class',
        description: 'Create a new ABAP class in SAP system (metadata only). This creates the class structure with package, description, and properties. Source code must be added separately with adt_save_source.',
        inputSchema: {
          type: 'object',
          properties: {
            class_name: {
              type: 'string',
              description: 'Name of the class to create (e.g., ZCL_MY_CLASS)'
            },
            description: {
              type: 'string',
              description: 'Class description'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550)'
            },
            final: {
              type: 'boolean',
              description: 'Whether class is final (default: true)',
              default: true
            },
            visibility: {
              type: 'string',
              description: 'Class visibility (default: public)',
              enum: ['public', 'private', 'protected'],
              default: 'public'
            }
          },
          required: ['class_name', 'description', 'package_name', 'transport_request']
        }
      },
      {
        name: 'adt_create_table',
        description: 'Create a new database table (DDIC table) in SAP system. This creates the basic table structure. Fields must be added separately.',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the table to create (e.g., ZTBL_MY_TABLE)'
            },
            description: {
              type: 'string',
              description: 'Table description'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550)'
            },
            delivery_class: {
              type: 'string',
              description: 'Delivery class (default: A - Application table)',
              default: 'A'
            },
            data_class: {
              type: 'string',
              description: 'Data class (default: APPL0)',
              default: 'APPL0'
            },
            size_category: {
              type: 'string',
              description: 'Size category (default: 0)',
              default: '0'
            }
          },
          required: ['table_name', 'description', 'package_name', 'transport_request']
        }
      },
      {
        name: 'adt_create_package',
        description: 'Create a new ABAP Package (Development Package) in SAP system. Packages are containers for ABAP objects.',
        inputSchema: {
          type: 'object',
          properties: {
            package_name: {
              type: 'string',
              description: 'Name of the package to create (e.g., ZPACKAGE, /NAMESPACE/PACKAGE)'
            },
            description: {
              type: 'string',
              description: 'Package description'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550)'
            },
            super_package: {
              type: 'string',
              description: 'Optional: Super package (parent package)'
            },
            package_type: {
              type: 'string',
              description: 'Package type (default: development)',
              enum: ['development', 'structure', 'main'],
              default: 'development'
            },
            software_component: {
              type: 'string',
              description: 'Optional: Software component'
            },
            transport_layer: {
              type: 'string',
              description: 'Optional: Transport layer (e.g., ZH03)'
            }
          },
          required: ['package_name', 'description', 'transport_request']
        }
      },
      {
        name: 'adt_create_interface',
        description: 'Create a new ABAP interface in SAP system. Interfaces define contracts for classes.',
        inputSchema: {
          type: 'object',
          properties: {
            interface_name: {
              type: 'string',
              description: 'Name of the interface to create (e.g., ZIF_MY_INTERFACE)'
            },
            description: {
              type: 'string',
              description: 'Interface description'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550)'
            }
          },
          required: ['interface_name', 'description', 'package_name', 'transport_request']
        }
      },
      {
        name: 'adt_create_program',
        description: 'Create a new ABAP program/report in SAP system. Supports executable programs, includes, module pools, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            program_name: {
              type: 'string',
              description: 'Name of the program to create (e.g., ZREPORT_TEST)'
            },
            description: {
              type: 'string',
              description: 'Program description'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550)'
            },
            program_type: {
              type: 'string',
              description: '1=Executable, I=Include, M=Module Pool, S=Subroutine',
              default: '1'
            }
          },
          required: ['program_name', 'description', 'package_name', 'transport_request']
        }
      },
      {
        name: 'adt_create_cds_view',
        description: 'Create a new CDS View (Core Data Services) in SAP system with optional DDL source code. Used for modern data modeling in S/4HANA.',
        inputSchema: {
          type: 'object',
          properties: {
            cds_name: {
              type: 'string',
              description: 'Name of the CDS view to create (e.g., Z_MY_CDS_VIEW)'
            },
            description: {
              type: 'string',
              description: 'CDS View description'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550)'
            },
            ddl_source: {
              type: 'string',
              description: 'Optional: Complete DDL source code including annotations and SELECT statement. If provided, creates a fully functional CDS view.'
            }
          },
          required: ['cds_name', 'description', 'package_name', 'transport_request']
        }
      },
      {
        name: 'adt_create_data_element',
        description: 'Create a new Data Element in SAP system with optional complete definition. If domain_name is provided, creates a fully defined data element with field labels.',
        inputSchema: {
          type: 'object',
          properties: {
            data_element_name: {
              type: 'string',
              description: 'Name of the data element to create (e.g., Z_MY_DTEL)'
            },
            description: {
              type: 'string',
              description: 'Data element description'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550)'
            },
            domain_name: {
              type: 'string',
              description: 'Optional: Domain name to reference (e.g., MATNR). If provided, creates complete data element definition.'
            },
            short_label: {
              type: 'string',
              description: 'Optional: Short field label (max 10 chars). Used in tight UI spaces.'
            },
            medium_label: {
              type: 'string',
              description: 'Optional: Medium field label (max 20 chars). Used in normal UI.'
            },
            long_label: {
              type: 'string',
              description: 'Optional: Long field label (max 40 chars). Used in detailed displays.'
            }
          },
          required: ['data_element_name', 'description', 'package_name', 'transport_request']
        }
      },
      {
        name: 'adt_create_domain',
        description: 'Create a new Domain in SAP system with optional complete definition. If data_type is provided, creates a fully defined domain ready to activate.',
        inputSchema: {
          type: 'object',
          properties: {
            domain_name: {
              type: 'string',
              description: 'Name of the domain to create (e.g., Z_MY_DOMAIN)'
            },
            description: {
              type: 'string',
              description: 'Domain description'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550)'
            },
            data_type: {
              type: 'string',
              description: 'Optional: Data type (CHAR, NUMC, INT4, DEC, etc.). If provided, creates complete domain definition.'
            },
            length: {
              type: 'string',
              description: 'Optional: Field length (e.g., "10", "20"). Default: "10"'
            },
            decimals: {
              type: 'string',
              description: 'Optional: Number of decimal places (e.g., "0", "2"). Default: "0"'
            }
          },
          required: ['domain_name', 'description', 'package_name', 'transport_request']
        }
      },
      {
        name: 'adt_create_table_type',
        description: 'Create a new Table Type in SAP system with optional complete definition. If line_type is provided, creates a fully defined table type ready to activate.',
        inputSchema: {
          type: 'object',
          properties: {
            table_type_name: {
              type: 'string',
              description: 'Name of the table type to create (e.g., Z_TT_CUSTOMER)'
            },
            description: {
              type: 'string',
              description: 'Table type description'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550)'
            },
            line_type: {
              type: 'string',
              description: 'Optional: Line type (data element or structure name). If provided, creates complete table type definition.'
            },
            table_category: {
              type: 'string',
              description: 'Optional: Table category (STANDARD, SORTED, HASHED). Default: "STANDARD"'
            },
            key_definition: {
              type: 'string',
              description: 'Optional: Key field names (comma-separated for sorted/hashed tables)'
            }
          },
          required: ['table_type_name', 'description', 'package_name', 'transport_request']
        }
      },
      {
        name: 'adt_create_structure',
        description: 'Create a new Structure in SAP system with optional field definitions. Structures are reusable data structures.',
        inputSchema: {
          type: 'object',
          properties: {
            structure_name: {
              type: 'string',
              description: 'Name of the structure to create (e.g., Z_S_ADDRESS)'
            },
            description: {
              type: 'string',
              description: 'Structure description'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550)'
            },
            fields: {
              type: 'array',
              description: 'Optional: Array of field definitions. Each field can have: field_name, data_element OR (data_type, length, decimals)',
              items: {
                type: 'object',
                properties: {
                  field_name: {
                    type: 'string',
                    description: 'Field name'
                  },
                  data_element: {
                    type: 'string',
                    description: 'Data element reference (preferred)'
                  },
                  data_type: {
                    type: 'string',
                    description: 'Direct data type (CHAR, NUMC, etc.) if not using data element'
                  },
                  length: {
                    type: 'string',
                    description: 'Length if using direct data type'
                  },
                  decimals: {
                    type: 'string',
                    description: 'Decimals if using direct data type'
                  }
                }
              }
            }
          },
          required: ['structure_name', 'description', 'package_name', 'transport_request']
        }
      },
      {
        name: 'adt_create_service_definition',
        description: 'Create a new Service Definition (SRVD) in SAP system. Service Definitions expose CDS entities as services.',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'Name of the service definition to create (e.g., ZAPI_MATERIAL_SEARCH)'
            },
            description: {
              type: 'string',
              description: 'Service definition description'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550). Leave empty for local objects.'
            },
            ddl_source: {
              type: 'string',
              description: 'Optional: Complete DDL source code. If provided, creates a fully defined service definition ready to activate.'
            }
          },
          required: ['service_name', 'description', 'package_name']
        }
      },
      {
        name: 'adt_create_service_binding',
        description: 'Create a new Service Binding (SRVB) in SAP system. Service Bindings expose service definitions as OData endpoints.',
        inputSchema: {
          type: 'object',
          properties: {
            binding_name: {
              type: 'string',
              description: 'Name of the service binding to create (e.g., ZSB_CALCULATOR_API_O4)'
            },
            description: {
              type: 'string',
              description: 'Service binding description'
            },
            service_definition: {
              type: 'string',
              description: 'Name of the service definition to bind (e.g., ZSD_CALCULATOR_API)'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550). Leave empty for local objects.'
            },
            binding_type: {
              type: 'string',
              description: 'Binding type (default: ODATA)',
              enum: ['ODATA'],
              default: 'ODATA'
            },
            binding_version: {
              type: 'string',
              description: 'OData version (default: V4)',
              enum: ['V2', 'V4'],
              default: 'V4'
            },
            service_type: {
              type: 'string',
              description: 'Service type: UI (for Fiori Elements/SAPUI5) or WEB_API (for REST integrations). Default: UI',
              enum: ['UI', 'WEB_API'],
              default: 'UI'
            }
          },
          required: ['binding_name', 'description', 'service_definition', 'package_name']
        }
      },
      {
        name: 'adt_read_service_binding',
        description: 'Read Service Binding metadata from SAP system. Returns detailed information about the service binding including service definition, binding type, published status, and more.',
        inputSchema: {
          type: 'object',
          properties: {
            binding_name: {
              type: 'string',
              description: 'Name of the service binding to read (e.g., ZSB_CALCULATOR_API_O4)'
            }
          },
          required: ['binding_name']
        }
      },
      {
        name: 'adt_create_behavior_definition',
        description: 'Create a new Behavior Definition (BDEF) in SAP system. Behavior Definitions define the behavior of RAP business objects (CRUD operations, validations, actions).',
        inputSchema: {
          type: 'object',
          properties: {
            bdef_name: {
              type: 'string',
              description: 'Name of the behavior definition (must match R-layer CDS view name, e.g., ZR_MATERIAL)'
            },
            description: {
              type: 'string',
              description: 'Behavior definition description'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550). Leave empty for local objects.'
            },
            source_code: {
              type: 'string',
              description: 'Complete behavior definition source code including managed/unmanaged, strict level, draft support, field properties, operations, and mapping'
            }
          },
          required: ['bdef_name', 'description', 'package_name', 'source_code']
        }
      },
      {
        name: 'adt_create_metadata_extension',
        description: 'Create a new Metadata Extension (DDLX) in SAP system. Metadata Extensions add UI annotations to CDS views for Fiori Elements applications.',
        inputSchema: {
          type: 'object',
          properties: {
            metadata_extension_name: {
              type: 'string',
              description: 'Name of the metadata extension to create (e.g., ZC_CUSTOMER)'
            },
            description: {
              type: 'string',
              description: 'Metadata extension description'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZPACKAGE, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550). Leave empty for local objects.'
            },
            source_code: {
              type: 'string',
              description: 'Optional: Complete DDLX source code with UI annotations. If not provided, creates empty metadata extension.'
            }
          },
          required: ['metadata_extension_name', 'description', 'package_name']
        }
      },
      {
        name: 'adt_generate_rap_ui_service',
        description: '🚀 Generate complete RAP UI Service (Business Object) using Eclipse ADT Generator. Creates R-layer CDS, C-layer CDS, Behavior Definition/Implementation, Draft Table, Service Definition, and Service Binding (OData V4) - all in ONE call!',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Database table name (e.g., ZTTMAT). Table must exist and have key fields.'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZFG, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550). Leave empty for local objects.'
            },
            description: {
              type: 'string',
              description: 'Optional: Description for generated objects. Defaults to table name.'
            }
          },
          required: ['table_name', 'package_name']
        }
      },
      {
        name: 'adt_generate_custom_query',
        description: '🔍 Generate Custom Query (Abstract Entity + Query Provider). Creates a complete custom query implementation with Abstract Entity, Query Provider Class implementing if_rap_query_provider, and optional Service Definition. Perfect for external APIs, complex aggregations, or custom business logic!',
        inputSchema: {
          type: 'object',
          properties: {
            entity_name: {
              type: 'string',
              description: 'Abstract entity name (e.g., ZCE_PRODUCT_SEARCH). Convention: ZCE_ prefix for Custom Entities.'
            },
            query_class_name: {
              type: 'string',
              description: 'Query provider class name (e.g., ZCL_PRODUCT_SEARCH_QRY)'
            },
            description: {
              type: 'string',
              description: 'Description for the custom query'
            },
            package_name: {
              type: 'string',
              description: 'Package name (e.g., ZAPI, $TMP for local)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., S4HK908550). Leave empty for local objects.'
            },
            input_parameters: {
              type: 'array',
              description: 'Input filter parameters. Each can be string (field name) or object with {name, type, label, mandatory}',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Parameter name (e.g., "category")'
                  },
                  type: {
                    type: 'string',
                    description: 'ABAP type (e.g., "abap.char(20)", "abap.dec(15,2)")'
                  },
                  label: {
                    type: 'string',
                    description: 'User-friendly label'
                  },
                  mandatory: {
                    type: 'boolean',
                    description: 'Is this filter mandatory?'
                  },
                  isKey: {
                    type: 'boolean',
                    description: 'Mark as key field'
                  }
                }
              }
            },
            output_fields: {
              type: 'array',
              description: 'Output result fields. Each can be string (field name) or object with {name, type, label, isKey}',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Field name (e.g., "product_id")'
                  },
                  type: {
                    type: 'string',
                    description: 'ABAP type (e.g., "abap.char(10)")'
                  },
                  label: {
                    type: 'string',
                    description: 'User-friendly label'
                  },
                  isKey: {
                    type: 'boolean',
                    description: 'Mark as key field'
                  }
                }
              }
            },
            create_service: {
              type: 'boolean',
              description: 'Create service definition automatically?'
            },
            service_name: {
              type: 'string',
              description: 'Service name (if create_service=true). Defaults to ZAPI_{entity_base_name}'
            }
          },
          required: ['entity_name', 'query_class_name', 'description', 'package_name']
        }
      },
      {
        name: 'adt_read_source',
        description: 'Read ABAP object source code from SAP system using ADT REST API. Works with classes, interfaces, programs, includes, CDS views, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the ABAP object (e.g., ZCL_MY_CLASS, ZMCP_PROGRAM, ZMCP_INCLUDE)'
            },
            object_type: {
              type: 'string',
              description: 'Object type: CLAS/CLASS, INTF/INTERFACE, PROG/REPORT, INCL/INCLUDE, DDLS/CDS, FUGR/FUNCTION_GROUP, FUNC/FUNCTION_MODULE, TABL/TABLE, STRUCT/STRUCTURE',
              enum: ['CLAS', 'CLASS', 'INTF', 'INTERFACE', 'PROG', 'REPORT', 'INCL', 'INCLUDE', 'DDLS', 'CDS', 'FUGR', 'FUNCTION_GROUP', 'FUNC', 'FUNCTION_MODULE', 'TABL', 'TABLE', 'STRUCT', 'STRUCTURE']
            }
          },
          required: ['object_name', 'object_type']
        }
      },
      {
        name: 'adt_save_source',
        description: 'Save ABAP object source code to SAP system. Workflow: Lock → Save → Syntax Check. Object remains LOCKED after save. Use adt_activate to unlock and activate. Supports batch workflow: save multiple objects, then activate all together.',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the ABAP object'
            },
            object_type: {
              type: 'string',
              description: 'Object type (CLAS, INTF, PROG, etc.)'
            },
            source_code: {
              type: 'string',
              description: 'Complete ABAP source code'
            }
          },
          required: ['object_name', 'object_type', 'source_code']
        }
      },
      {
        name: 'adt_save_testclass_source',
        description: 'Save test class source code for a class. Workflow: Lock class → Save test class include → keep LOCKED. Use for saving /includes/testclasses content. Use adt_activate to unlock and activate.',
        inputSchema: {
          type: 'object',
          properties: {
            class_name: {
              type: 'string',
              description: 'Name of the class (without _TEST suffix)'
            },
            source_code: {
              type: 'string',
              description: 'Complete test class source code (all test classes)'
            }
          },
          required: ['class_name', 'source_code']
        }
      },
      {
        name: 'adt_read_testclass_source',
        description: 'Read test class source code from a class. Returns the ABAP Unit test classes (ltcl_*) from /includes/testclasses. Test classes contain setup, test methods, and assertions.',
        inputSchema: {
          type: 'object',
          properties: {
            class_name: {
              type: 'string',
              description: 'Name of the class (e.g., ZCL_USER_ACTIVITY_TRACKER)'
            }
          },
          required: ['class_name']
        }
      },
      {
        name: 'adt_read_local_implementations',
        description: 'Read local implementations (handler/saver classes) from a class. Returns the source code of lhc_* and lsc_* classes from /includes/implementations. Used for RAP behavior handler classes.',
        inputSchema: {
          type: 'object',
          properties: {
            class_name: {
              type: 'string',
              description: 'Name of the class (e.g., ZBP_R_MMT_AUG3)'
            }
          },
          required: ['class_name']
        }
      },
      {
        name: 'adt_save_local_implementations',
        description: 'Save local implementations (handler/saver classes) for a class. Workflow: Lock class → Save /includes/implementations → keep LOCKED. Used for RAP behavior handler classes (lhc_*, lsc_*). Use adt_activate to unlock and activate.',
        inputSchema: {
          type: 'object',
          properties: {
            class_name: {
              type: 'string',
              description: 'Name of the class (e.g., ZBP_CE_CALCULATOR_API)'
            },
            source_code: {
              type: 'string',
              description: 'Complete local implementations source code (handler and saver classes)'
            }
          },
          required: ['class_name', 'source_code']
        }
      },
      {
        name: 'adt_check_syntax',
        description: 'Check syntax of a saved ABAP object. Returns errors, warnings, and info messages with line numbers.',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the ABAP object'
            },
            object_type: {
              type: 'string',
              description: 'Object type (CLAS, INTF, PROG, etc.)'
            },
            version: {
              type: 'string',
              description: 'Version to check: "active" or "inactive"',
              enum: ['active', 'inactive'],
              default: 'inactive'
            }
          },
          required: ['object_name', 'object_type']
        }
      },
      {
        name: 'adt_check_syntax_unsaved',
        description: 'Check syntax of unsaved ABAP source code WITHOUT saving to SAP. Validates AI-generated or modified code before committing. Source is sent as Base64-encoded content. Use this to validate before saving.',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the ABAP object (for context)'
            },
            object_type: {
              type: 'string',
              description: 'Object type (CLAS, INTF, PROG, etc.)'
            },
            source_code: {
              type: 'string',
              description: 'Complete ABAP source code to validate'
            }
          },
          required: ['object_name', 'object_type', 'source_code']
        }
      },
      {
        name: 'adt_run_tests',
        description: 'Run ABAP Unit tests for a class. Executes all test classes and returns detailed results including pass/fail status, execution times, and error messages.',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the object to test (e.g., class name)'
            },
            object_type: {
              type: 'string',
              description: 'Object type (CLAS, PROG, etc.)',
              default: 'CLAS'
            }
          },
          required: ['object_name']
        }
      },
      {
        name: 'adt_execute_class',
        description: 'Execute runnable class (F9 functionality). Runs the if_oo_adt_classrun~main method and returns the console output. The class must implement the if_oo_adt_classrun interface and be activated.',
        inputSchema: {
          type: 'object',
          properties: {
            class_name: {
              type: 'string',
              description: 'Name of the runnable class to execute (e.g., ZCL_O9_DATA_ANALYZER)'
            }
          },
          required: ['class_name']
        }
      },
      {
        name: 'adt_activate',
        description: 'Unlock and activate ABAP objects. Workflow: Unlock → Activate. Supports BATCH activation - unlock and activate multiple objects in one operation. Use this after saving one or more objects with adt_save_source.',
        inputSchema: {
          type: 'object',
          properties: {
            objects: {
              type: 'array',
              description: 'List of objects to unlock and activate (supports batch operations)',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Object name' },
                  type: { type: 'string', description: 'Object type' }
                },
                required: ['name', 'type']
              }
            }
          },
          required: ['objects']
        }
      },
      {
        name: 'adt_update_and_activate',
        description: 'Complete workflow for SINGLE object: Lock → Save → Unlock → Syntax Check → Activate. Use this for quick single-object updates. For batch operations, use adt_save_source (multiple times) then adt_activate.',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the ABAP object'
            },
            object_type: {
              type: 'string',
              description: 'Object type (CLAS, INTF, PROG, etc.)'
            },
            source_code: {
              type: 'string',
              description: 'Complete ABAP source code'
            }
          },
          required: ['object_name', 'object_type', 'source_code']
        }
      },
      {
        name: 'adt_where_used_list',
        description: 'Find where an ABAP object is being used (where-used list). Returns all references to the specified object across the system. Useful for impact analysis before making changes.',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the ABAP object (e.g., ZCL_MY_CLASS, ZI_MY_CDS)'
            },
            object_type: {
              type: 'string',
              description: 'Object type: CLAS/CLASS, INTF/INTERFACE, PROG/REPORT, DDLS/CDS, TABL/TABLE, etc.',
              enum: ['CLAS', 'CLASS', 'INTF', 'INTERFACE', 'PROG', 'REPORT', 'DDLS', 'CDS', 'TABL', 'TABLE', 'FUGR', 'FUNCTION_GROUP', 'DTEL', 'DATA_ELEMENT', 'DOMA', 'DOMAIN']
            }
          },
          required: ['object_name', 'object_type']
        }
      },
      {
        name: 'adt_reassign_package',
        description: 'Reassign an ABAP object to a new package. This is a refactoring operation that moves the object from its current package to a new package and updates the transport request.',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the ABAP object to reassign (e.g., ZCL_MY_CLASS, /COREVIST/T_MAT_INC_EXC)'
            },
            object_type: {
              type: 'string',
              description: 'Object type: CLAS, INTF, PROG, DDLS, BDEF (behavior definition), TABL, TTYP (table type), DTEL (data element), DOMA (domain), STRUCT (structure), SUSH (authorization default), SCO3 (outbound service)',
              enum: ['CLAS', 'INTF', 'PROG', 'DDLS', 'BDEF', 'TABL', 'TTYP', 'DTEL', 'DOMA', 'STRUCT', 'SUSH', 'SCO3']
            },
            current_package: {
              type: 'string',
              description: 'Current package name (e.g., /COREVIST/MATERIALS_INC_EXC)'
            },
            new_package: {
              type: 'string',
              description: 'New package name to assign the object to (e.g., /COREVIST/CART)'
            },
            transport_request: {
              type: 'string',
              description: 'Transport request number (e.g., H01K900008)'
            },
            description: {
              type: 'string',
              description: 'Optional: Object description. If not provided, defaults to "{type} {name}"'
            }
          },
          required: ['object_name', 'object_type', 'current_package', 'new_package', 'transport_request']
        }
      },
      {
        name: 'adt_unlock',
        description: 'Unlock ABAP objects. Releases locks on objects so they can be modified by other users or in other sessions. Supports batch unlocking - unlock multiple objects in one operation. Use this when you want to unlock objects without activating them.',
        inputSchema: {
          type: 'object',
          properties: {
            objects: {
              type: 'array',
              description: 'List of objects to unlock (supports batch operations)',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Object name (e.g., ZCL_MY_CLASS)'
                  },
                  type: {
                    type: 'string',
                    description: 'Object type (e.g., CLAS, INTF, DDLS, etc.)'
                  },
                  lock_handle: {
                    type: 'string',
                    description: 'Optional: Lock handle from previous lock operation. If not provided, system will attempt to unlock using object metadata.'
                  }
                },
                required: ['name', 'type']
              }
            }
          },
          required: ['objects']
        }
      },
      {
        name: 'adt_remove_objects_from_transport',
        description: 'Remove objects from a transport request or task. This allows you to remove objects that were added to a transport request/task.',
        inputSchema: {
          type: 'object',
          properties: {
            transport_number: {
              type: 'string',
              description: 'Transport request or task number (e.g., H01K900028)'
            },
            objects: {
              type: 'array',
              description: 'List of objects to remove from the transport',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Object name (e.g., /COREVIST/OPEN_ITEMS_SRV_SCM        0001)'
                  },
                  type: {
                    type: 'string',
                    description: 'Object type (e.g., GCPM, CLAS, TABL, etc.)'
                  },
                  pgmid: {
                    type: 'string',
                    description: 'Program ID (default: R3TR)',
                    default: 'R3TR'
                  },
                  obj_desc: {
                    type: 'string',
                    description: 'Object description (optional)'
                  },
                  position: {
                    type: 'string',
                    description: 'Position in transport (optional, e.g., 000043)'
                  }
                },
                required: ['name', 'type']
              }
            }
          },
          required: ['transport_number', 'objects']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'adt_create_class': {
        const result = await adtService.createClass(
          args.class_name,
          args.description,
          args.package_name,
          args.transport_request,
          {
            final: args.final !== undefined ? args.final : true,
            visibility: args.visibility || 'public'
          }
        );

        let responseText;
        if (result.success) {
          responseText = `✅ **Successfully Created Class ${result.className}**

**Class Details:**
- Name: ${result.className}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}
- Final: ${args.final !== false}
- Visibility: ${args.visibility || 'public'}

**Class metadata created successfully!**

⚠️ **Next Steps:**
The class structure has been created, but it has no source code yet.

**To add source code:**
1. Generate the ABAP source code (DEFINITION and IMPLEMENTATION)
2. Use \`adt_save_source\` to add the source code
3. Use \`adt_activate\` to activate the class

**Or use the complete workflow:**
- Just call \`adt_update_and_activate\` with the full source code
  (it will handle lock, save, unlock, check, and activate)
`;
        } else {
          const parsedError = parseAdtError(result.details);
          const isSessionTimeout = result.error && result.error.includes('Session Timed Out');
          
          responseText = `❌ **Failed to Create Class ${args.class_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**SAP Error Message:**
${parsedError.message}
${parsedError.hint ? `\n**Hint:** ${parsedError.hint}` : ''}

**Possible reasons:**
- Class already exists
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid class name format
${isSessionTimeout ? '- SAP session timed out (system may be experiencing locking issues)' : ''}

${isSessionTimeout ? '💡 **Tip:** Session timeouts are common with locking issues. Safe to retry!' : ''}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_table': {
        const result = await adtService.createTable(
          args.table_name,
          args.description,
          args.package_name,
          args.transport_request,
          {
            deliveryClass: args.delivery_class || 'A',
            dataClass: args.data_class || 'APPL0',
            sizeCategory: args.size_category || '0'
          }
        );

        let responseText;
        if (result.success) {
          responseText = `✅ **Successfully Created Table ${result.tableName}**

**Table Details:**
- Name: ${result.tableName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}
- Delivery Class: ${args.delivery_class || 'A'}
- Data Class: ${args.data_class || 'APPL0'}

**Table metadata created successfully!**

⚠️ **Next Steps:**
The table structure has been created, but it has no fields yet.

**To add fields and define the table:**
1. Use SE11 or Eclipse ADT to add fields manually
2. Or use \`adt_update_and_activate\` to modify the table definition

**Note:** Table creation via ADT creates only the basic structure.
Field definitions are typically added through the DDIC editor.
`;
        } else {
          const parsedError = parseAdtError(result.details);
          const isSessionTimeout = result.error && result.error.includes('Session Timed Out');
          
          responseText = `❌ **Failed to Create Table ${args.table_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**SAP Error Message:**
${parsedError.message}
${parsedError.hint ? `\n**Hint:** ${parsedError.hint}` : ''}

**Possible reasons:**
- Table already exists
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid table name format
${isSessionTimeout ? '- SAP session timed out (system may be experiencing locking issues)' : ''}

${isSessionTimeout ? '💡 **Tip:** Session timeouts are common with locking issues. Safe to retry!' : ''}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_package': {
        const result = await adtService.createPackage(
          args.package_name,
          args.description,
          args.transport_request,
          {
            superPackage: args.super_package || '',
            packageType: args.package_type || 'development',
            softwareComponent: args.software_component || '',
            transportLayer: args.transport_layer || ''
          }
        );

        let responseText;
        if (result.success) {
          responseText = `✅ **Successfully Created Package ${result.packageName}**

**Package Details:**
- Name: ${result.packageName}
- Description: ${args.description}
- Package Type: ${result.packageType}
- Transport: ${result.transportRequest}
${result.superPackage ? `- Super Package: ${result.superPackage}` : ''}
${args.software_component ? `- Software Component: ${args.software_component}` : ''}
${args.transport_layer ? `- Transport Layer: ${args.transport_layer}` : ''}

**Package created successfully!**

🎉 Your new package is ready to use! You can now create ABAP objects (classes, tables, CDS views, etc.) and assign them to this package.
`;
        } else {
          const parsedError = parseAdtError(result.details);
          const isSessionTimeout = result.error && result.error.includes('Session Timed Out');
          
          responseText = `❌ **Failed to Create Package ${args.package_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**SAP Error Message:**
${parsedError.message}
${parsedError.hint ? `\n**Hint:** ${parsedError.hint}` : ''}

${result.fullErrorData ? `\n**Full Error Details:**\n\`\`\`json\n${result.fullErrorData}\n\`\`\`` : ''}

**Possible reasons:**
- Package already exists
- Transport request doesn't exist or is locked
- Super package doesn't exist
- No authorization to create packages
- Invalid package name format
${isSessionTimeout ? '- SAP session timed out (system may be experiencing locking issues)' : ''}

${isSessionTimeout ? '💡 **Tip:** Session timeouts are common with locking issues. Safe to retry!' : ''}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_interface': {
        const result = await adtService.createInterface(
          args.interface_name,
          args.description,
          args.package_name,
          args.transport_request
        );

        let responseText;
        if (result.success) {
          responseText = `✅ **Successfully Created Interface ${result.interfaceName}**

**Interface Details:**
- Name: ${result.interfaceName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}

**Interface metadata created successfully!**

**Next Steps:**
1. Use \`adt_save_source\` to add interface definition
2. Use \`adt_activate\` to activate the interface

**Example:**
\`\`\`
adt_save_source({
  object_name: "${result.interfaceName}",
  object_type: "INTF",
  source_code: "INTERFACE ${result.interfaceName.toLowerCase()}..."
})
\`\`\`
`;
        } else {
          responseText = `❌ **Failed to Create Interface ${args.interface_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Interface already exists
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid interface name format

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_program': {
        const result = await adtService.createProgram(
          args.program_name,
          args.description,
          args.package_name,
          args.transport_request,
          { programType: args.program_type || '1' }
        );

        let responseText;
        if (result.success) {
          const programTypes = {
            '1': 'Executable Program',
            'I': 'Include Program',
            'M': 'Module Pool',
            'S': 'Subroutine',
            'F': 'Function Group',
            'J': 'Interface Pool',
            'K': 'Class Pool'
          };
          
          responseText = `✅ **Successfully Created Program ${result.programName}**

**Program Details:**
- Name: ${result.programName}
- Type: ${programTypes[result.programType] || result.programType}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}

**Program metadata created successfully!**

**Next Steps:**
1. Use \`adt_save_source\` to add program code
2. Use \`adt_activate\` to activate the program

**Example:**
\`\`\`
adt_save_source({
  object_name: "${result.programName}",
  object_type: "PROG",
  source_code: "REPORT ${result.programName.toLowerCase()}..."
})
\`\`\`
`;
        } else {
          responseText = `❌ **Failed to Create Program ${args.program_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Program already exists
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid program name format

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_cds_view': {
        const options = {};
        if (args.ddl_source) options.ddlSource = args.ddl_source;
        
        const result = await adtService.createCdsView(
          args.cds_name,
          args.description,
          args.package_name,
          args.transport_request,
          options
        );

        let responseText;
        if (result.success) {
          if (result.hasDdlSource) {
            // Complete CDS view with DDL source
            responseText = `✅ **Successfully Created Complete CDS View ${result.cdsName}**

**CDS View Details:**
- Name: ${result.cdsName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}
- **DDL Source: Added ✓**

**✨ CDS view is FULLY DEFINED with DDL source code and ready to activate!**

**Next Steps:**
1. Use \`adt_activate\` to activate the CDS view:
   \`\`\`
   adt_activate({ objects: [{ name: "${result.cdsName}", type: "DDLS" }] })
   \`\`\`
2. Optionally check syntax before activation

**Status:** 🎉 Complete CDS view created!
`;
          } else {
            // Metadata only
            responseText = `✅ **Successfully Created CDS View ${result.cdsName}**

**CDS View Details:**
- Name: ${result.cdsName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}

**CDS View metadata created successfully!**

**Next Steps:**
1. Use \`adt_save_source\` to add DDL definition
2. Use \`adt_activate\` to activate the CDS view

**Example:**
\`\`\`
adt_save_source({
  object_name: "${result.cdsName}",
  object_type: "DDLS",
  source_code: "define view entity ${result.cdsName} as select from table { key field1, field2 }"
})
\`\`\`

**Note:** To create a complete CDS view, provide ddl_source parameter.
`;
          }
        } else {
          const parsedError = parseAdtError(result.details);
          const isSessionTimeout = result.error && result.error.includes('Session Timed Out');
          
          responseText = `❌ **Failed to Create CDS View ${args.cds_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**SAP Error Message:**
${parsedError.message}
${parsedError.hint ? `\n**Hint:** ${parsedError.hint}` : ''}

**Possible reasons:**
- CDS View already exists
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid CDS name format
- Invalid DDL source code (if ddl_source was provided)
${isSessionTimeout ? '- SAP session timed out (system may be experiencing locking issues)' : ''}

${isSessionTimeout ? '💡 **Tip:** Session timeouts are common with locking issues. Safe to retry!' : ''}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_data_element': {
        const options = {};
        if (args.domain_name) options.domainName = args.domain_name;
        if (args.short_label) options.shortLabel = args.short_label;
        if (args.medium_label) options.mediumLabel = args.medium_label;
        if (args.long_label) options.longLabel = args.long_label;
        
        const result = await adtService.createDataElement(
          args.data_element_name,
          args.description,
          args.package_name,
          args.transport_request,
          options
        );

        let responseText;
        if (result.success) {
          if (result.domainName) {
            // Complete definition created
            responseText = `✅ **Successfully Created Complete Data Element ${result.dataElementName}**

**Data Element Details:**
- Name: ${result.dataElementName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}
- **Domain: ${result.domainName}**
- **Short Label: "${result.shortLabel || '(empty)'}"**
- **Medium Label: "${result.mediumLabel || '(empty)'}"**
- **Long Label: "${result.longLabel || '(empty)'}"**

**✨ Data element is FULLY DEFINED and ready to activate!**

**Next Steps:**
1. Use \`adt_activate\` to activate the data element:
   \`\`\`
   adt_activate({ objects: [{ name: "${result.dataElementName}", type: "DTEL" }] })
   \`\`\`
2. Optionally add search help or documentation in SE11

**Status:** 🎉 Complete definition created!
`;
          } else {
            // Metadata only
            responseText = `✅ **Successfully Created Data Element ${result.dataElementName}**

**Data Element Details:**
- Name: ${result.dataElementName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}

**Data Element metadata created successfully!**

**Next Steps:**
1. Use SE11 or Eclipse ADT to define:
   - Domain reference or built-in type
   - Field labels (short, medium, long)
   - Search help
   - Documentation
2. Activate the data element

**Note:** To create a complete definition, provide domain_name and field labels parameters.
`;
          }
        } else {
          responseText = `❌ **Failed to Create Data Element ${args.data_element_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Data Element already exists
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid data element name format
- Domain doesn't exist (if domain_name was provided)

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_domain': {
        const result = await adtService.createDomain(
          args.domain_name,
          args.description,
          args.package_name,
          args.transport_request,
          {
            dataType: args.data_type,
            length: args.length,
            decimals: args.decimals
          }
        );

        let responseText;
        if (result.success) {
          if (result.dataType) {
            // Complete domain created
            responseText = `✅ **Successfully Created Complete Domain ${result.domainName}**

**Domain Details:**
- Name: ${result.domainName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}
- **Data Type: ${result.dataType}**
- **Length: ${result.length}**
- **Decimals: ${result.decimals}**

**✨ Domain is FULLY DEFINED and ready to activate!**

**Next Steps:**
1. Use \`adt_activate\` to activate the domain:
   \`\`\`
   adt_activate({ objects: [{ name: "${result.domainName}", type: "DOMA" }] })
   \`\`\`
2. Optionally add fixed values or value tables in SE11

**Status:** 🎉 Complete definition created!
`;
          } else {
            // Metadata only
            responseText = `✅ **Successfully Created Domain ${result.domainName}**

**Domain Details:**
- Name: ${result.domainName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}

**Domain metadata created successfully!**

**Next Steps:**
1. Use SE11 or Eclipse ADT to define:
   - Data type (CHAR, NUMC, INT, etc.)
   - Length and decimals
   - Value range (fixed values or intervals)
   - Conversion routines
2. Activate the domain

**💡 Tip:** Provide \`data_type\`, \`length\`, and \`decimals\` parameters to create a complete domain in one step!
`;
          }
        } else {
          responseText = `❌ **Failed to Create Domain ${args.domain_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Domain already exists
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid domain name format

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_table_type': {
        const options = {};
        if (args.line_type) options.lineType = args.line_type;
        if (args.table_category) options.tableCategory = args.table_category;
        if (args.key_definition) options.keyDefinition = args.key_definition;
        
        const result = await adtService.createTableType(
          args.table_type_name,
          args.description,
          args.package_name,
          args.transport_request,
          options
        );

        let responseText;
        if (result.success) {
          if (result.lineType) {
            // Complete table type created
            responseText = `✅ **Successfully Created Complete Table Type ${result.tableTypeName}**

**Table Type Details:**
- Name: ${result.tableTypeName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}
- **Line Type: ${result.lineType}**
- **Table Category: ${result.tableCategory}**
- **Key Definition: ${result.keyDefinition || '(none)'}**

**✨ Table type is FULLY DEFINED and ready to activate!**

**Next Steps:**
1. Use \`adt_activate\` to activate the table type:
   \`\`\`
   adt_activate({ objects: [{ name: "${result.tableTypeName}", type: "TTYP" }] })
   \`\`\`
2. Use this table type in your ABAP programs or classes

**Status:** 🎉 Complete definition created!
`;
          } else {
            // Metadata only
            responseText = `✅ **Successfully Created Table Type ${result.tableTypeName}**

**Table Type Details:**
- Name: ${result.tableTypeName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}

**Table Type metadata created successfully!**

**Next Steps:**
1. Use SE11 or Eclipse ADT to define:
   - Line type (structure or data element)
   - Table category (STANDARD, SORTED, HASHED)
   - Key fields (for sorted/hashed tables)
2. Activate the table type

**💡 Tip:** Provide \`line_type\` parameter to create a complete table type in one step!
`;
          }
        } else {
          responseText = `❌ **Failed to Create Table Type ${args.table_type_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Table Type already exists
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid table type name format
- Line type doesn't exist (if line_type was provided)

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_structure': {
        const options = {};
        if (args.fields) options.fields = args.fields;
        
        const result = await adtService.createStructure(
          args.structure_name,
          args.description,
          args.package_name,
          args.transport_request,
          options
        );

        let responseText;
        if (result.success) {
          if (result.fieldCount) {
            // Complete structure created
            responseText = `✅ **Successfully Created Complete Structure ${result.structureName}**

**Structure Details:**
- Name: ${result.structureName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}
- **Field Count: ${result.fieldCount}**

**✨ Structure is FULLY DEFINED with field definitions and ready to activate!**

**Next Steps:**
1. Use \`adt_activate\` to activate the structure:
   \`\`\`
   adt_activate({ objects: [{ name: "${result.structureName}", type: "TABL" }] })
   \`\`\`
2. Use this structure in your ABAP programs, tables, or CDS views

**Status:** 🎉 Complete definition created!
`;
          } else {
            // Metadata only
            responseText = `✅ **Successfully Created Structure ${result.structureName}**

**Structure Details:**
- Name: ${result.structureName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest}

**Structure metadata created successfully!**

**Next Steps:**
1. Use SE11 or Eclipse ADT to add fields:
   - Define field names
   - Assign data elements or direct types
   - Set key fields
   - Add includes if needed
2. Activate the structure

**💡 Tip:** Provide \`fields\` array parameter to create a complete structure in one step!
`;
          }
        } else {
          responseText = `❌ **Failed to Create Structure ${args.structure_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Structure already exists
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid structure name format
- Data elements don't exist (if fields were provided)

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_service_definition': {
        const options = {};
        if (args.ddl_source) options.ddlSource = args.ddl_source;
        
        const result = await adtService.createServiceDefinition(
          args.service_name,
          args.description,
          args.package_name,
          args.transport_request || '',
          options
        );

        let responseText;
        if (result.success) {
          if (options.ddlSource) {
            responseText = `✅ **Successfully Created Complete Service Definition ${result.serviceName}**

**Service Definition Details:**
- Name: ${result.serviceName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest || 'Local ($TMP)'}
- **DDL Source: Added ✓**

**✨ Service definition is FULLY DEFINED with DDL source code and ready to activate!**

**Next Steps:**
1. Use \`adt_activate\` to activate the service definition:
   \`\`\`
   adt_activate({ objects: [{ name: "${result.serviceName}", type: "SRVD" }] })
   \`\`\`
2. Create a Service Binding to expose this service as OData

**Status:** 🎉 Complete service definition created!
`;
          } else {
            responseText = `✅ **Successfully Created Service Definition ${result.serviceName}**

**Service Definition Details:**
- Name: ${result.serviceName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest || 'Local ($TMP)'}

**Service definition metadata created successfully!**

**Next Steps:**
1. Add DDL source code:
   \`\`\`abap
   @EndUserText.label: 'My Service'
   define service ${result.serviceName} {
     expose ZCE_MY_ENTITY as MyEntity;
   }
   \`\`\`
2. Use \`adt_save_source\` or \`adt_update_and_activate\` to add the DDL
3. Create a Service Binding

**💡 Tip:** Provide \`ddl_source\` parameter to create a complete service definition in one step!
`;
          }
        } else {
          responseText = `❌ **Failed to Create Service Definition ${args.service_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Service definition already exists
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid service name format
- Invalid DDL source code (if ddl_source was provided)

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_service_binding': {
        const options = {};
        if (args.binding_type) options.bindingType = args.binding_type;
        if (args.binding_version) options.bindingVersion = args.binding_version;
        if (args.service_type) options.serviceType = args.service_type;
        
        const result = await adtService.createServiceBinding(
          args.binding_name,
          args.description,
          args.service_definition,
          args.package_name,
          args.transport_request || '',
          options
        );

        let responseText;
        if (result.success) {
          responseText = `✅ **Successfully Created Service Binding ${result.bindingName}**

**Service Binding Details:**
- Name: ${result.bindingName}
- Description: ${args.description}
- Service Definition: ${result.serviceDefinition}
- Package: ${result.packageName}
- Transport: ${result.transportRequest || 'Local ($TMP)'}
- Binding Type: ${result.bindingType} ${result.bindingVersion}
- Service Type: ${result.serviceType === 'WEB_API' ? '🌐 Web API (REST integrations)' : '🎨 UI (Fiori Elements/SAPUI5)'}
- Binding Category: ${result.bindingCategory} (${result.serviceType === 'WEB_API' ? 'Web API' : 'UI'})

**✨ Service binding created successfully!**

**Next Steps:**
1. Activate the service binding:
   \`\`\`
   adt_activate({ objects: [{ name: "${result.bindingName}", type: "SRVB" }] })
   \`\`\`
2. **Publish the service** (in Eclipse ADT):
   - Open service binding ${result.bindingName}
   - Click "Publish" button
   - Service will be available via OData

**OData Endpoint (after activation & publish):**
\`\`\`
https://your-server:port/sap/opu/odata4/sap/${result.serviceDefinition.toLowerCase()}/srvd/sap/${result.bindingName.toLowerCase()}/0001/
\`\`\`

**Status:** 🎉 Service binding ready to activate!
`;
        } else {
          const parsedError = parseAdtError(result.details);
          const isSessionTimeout = result.error && result.error.includes('Session Timed Out');
          
          responseText = `❌ **Failed to Create Service Binding ${args.binding_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**SAP Error Message:**
${parsedError.message}
${parsedError.hint ? `\n**Hint:** ${parsedError.hint}` : ''}

**Possible reasons:**
- Service binding already exists
- Service definition doesn't exist or isn't activated
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid binding name format
${isSessionTimeout ? '- SAP session timed out (system may be experiencing locking issues)' : ''}

${isSessionTimeout ? '💡 **Tip:** Session timeouts are common with locking issues. Safe to retry!' : ''}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_read_service_binding': {
        const result = await adtService.readServiceBinding(args.binding_name);

        let responseText;
        if (result.success) {
          const meta = result.metadata;
          responseText = `✅ **Service Binding: ${result.bindingName}**

**Basic Information:**
- Name: ${meta.name}
- Type: ${meta.type}
- Description: ${meta.description || 'N/A'}
- Package: ${meta.packageName}
- Version: ${meta.version}

**Service Configuration:**
- Service Definition: ${meta.serviceDefinition}
- Binding Type: ${meta.bindingType} ${meta.bindingVersion}
- Binding Category: ${meta.bindingCategory}

**Status:**
- Published: ${meta.published ? '✅ Yes' : '⚠️ No (not yet published)'}
- Binding Created: ${meta.bindingCreated ? '✅ Yes' : '⚠️ No'}
- Release Supported: ${meta.releaseSupported ? 'Yes' : 'No'}

**Audit Trail:**
- Created By: ${meta.createdBy} at ${meta.createdAt}
- Changed By: ${meta.changedBy} at ${meta.changedAt}

${!meta.published ? '\n**Next Step:** Publish the service binding in Eclipse ADT or SAPGUI' : ''}
`;
        } else {
          const parsedError = parseAdtError(result.details);
          responseText = `❌ **Failed to Read Service Binding ${args.binding_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Details:**
${parsedError.message}

**Hint:** ${parsedError.hint || result.hint || 'Service binding may not exist or you may not have read authorization'}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_behavior_definition': {
        const result = await adtService.createBehaviorDefinition(
          args.bdef_name,
          args.description,
          args.package_name,
          args.transport_request || '',
          args.source_code
        );

        let responseText;
        if (result.success) {
          responseText = `✅ **Successfully Created Behavior Definition ${result.bdefName}**

**Behavior Definition Details:**
- Name: ${result.bdefName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest || 'Local ($TMP)'}
- URI: ${result.uri}

**✨ Behavior definition is CREATED and ready to activate!**

**Next Steps:**
1. Use \`adt_activate\` to activate the behavior definition:
   \`\`\`
   adt_activate({ objects: [{ name: "${result.bdefName}", type: "BDEF" }] })
   \`\`\`
2. Create the Behavior Implementation Class referenced in the definition
3. Test CRUD operations via Fiori Elements preview

**Status:** 🎉 Behavior definition created!
`;
        } else {
          responseText = `❌ **Failed to Create Behavior Definition ${args.bdef_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Behavior definition already exists
- R-layer CDS view doesn't exist
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid behavior definition syntax
- Referenced tables (persistent or draft) don't exist

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_create_metadata_extension': {
        const result = await adtService.createMetadataExtension(
          args.metadata_extension_name,
          args.description,
          args.package_name,
          args.transport_request || '',
          args.source_code || ''
        );

        let responseText;
        if (result.success) {
          responseText = `✅ **Successfully Created Metadata Extension ${result.metadataExtensionName}**

**Metadata Extension Details:**
- Name: ${result.metadataExtensionName}
- Description: ${args.description}
- Package: ${result.packageName}
- Transport: ${result.transportRequest || 'Local ($TMP)'}
- URI: ${result.uri}

**✨ Metadata extension is CREATED and ready to activate!**

**Next Steps:**
${args.source_code ? `1. Use \`adt_activate\` to activate the metadata extension:
   \`\`\`
   adt_activate({ objects: [{ name: "${result.metadataExtensionName}", type: "DDLX" }] })
   \`\`\`
2. Preview the Fiori Elements app to see UI annotations` : `1. Add source code with \`adt_save_source\`:
   \`\`\`
   adt_save_source({ 
     object_name: "${result.metadataExtensionName}", 
     object_type: "DDLX", 
     source_code: "<your DDLX source>" 
   })
   \`\`\`
2. Activate with \`adt_activate\`
3. Preview the Fiori Elements app`}

**Status:** 🎉 Metadata extension created!
`;
        } else {
          responseText = `❌ **Failed to Create Metadata Extension ${args.metadata_extension_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Metadata extension already exists
- CDS view doesn't exist
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid metadata extension name format

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_generate_rap_ui_service': {
        const options = {};
        if (args.description) options.description = args.description;
        
        const result = await adtService.generateRapUiService(
          args.table_name,
          args.package_name,
          args.transport_request || '',
          options
        );

        let responseText;
        if (result.success) {
          responseText = `🚀 **RAP UI Service Generated Successfully!**

**Source Table:** ${result.tableName}
**Package:** ${result.package}
**Transport:** ${result.transportRequest || 'Local ($TMP)'}

## 📦 Generated Artifacts

### 1. **Data Model Layer (R-Layer)**
- **CDS View:** \`${result.generated.rLayerCds}\`
  - Root entity with all table fields
  - Managed implementation
  - Behavior definition

### 2. **Projection Layer (C-Layer)**
- **CDS View:** \`${result.generated.cLayerCds}\`
  - Consumption projection
  - Used by UI

### 3. **Behavior Implementation**
- **Class:** \`${result.generated.behaviorClass}\`
  - BOPF behavior implementation
  - Handles CRUD operations

### 4. **Draft Support**
- **Draft Table:** \`${result.generated.draftTable}\`
  - Enables draft functionality
  - Allows save-and-resume

### 5. **Service Layer**
- **Service Definition:** \`${result.generated.serviceDefinition}\`
  - Defines exposed entities
- **Service Binding:** \`${result.generated.serviceBinding}\`
  - OData V4 - UI binding
  - **URI:** \`${result.generated.serviceBindingUri}\`

---

## 🎯 Next Steps

### 1. **Activate the Service Binding** (if not auto-activated)
   Open in Eclipse ADT and publish the service

### 2. **Preview the Fiori Elements App**
   Right-click on service binding → Preview

### 3. **Customize the UI**
   - Add metadata extensions for field labels
   - Configure selection fields
   - Define field groups and facets
   - Set up value helps

### 4. **Enhance Behavior**
   - Add validations in \`${result.generated.behaviorClass}\`
   - Implement determinations
   - Add actions and functions

### 5. **Test the Service**
   Access OData endpoint:
   \`\`\`
   ${SAP_CONFIG.baseUrl}${result.generated.serviceBindingUri}
   \`\`\`

---

## 📚 What Was Created

This RAP Business Object includes:
- ✅ Managed scenario (no coding for CRUD)
- ✅ Draft enabled (save & resume)
- ✅ OData V4 service (modern protocol)
- ✅ Fiori Elements ready (zero-UI development)
- ✅ Full transactional support

**Status:** 🎉 **PRODUCTION READY!**
`;
        } else {
          responseText = `❌ **Failed to Generate RAP UI Service for ${args.table_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Table doesn't exist
- Table has no key fields
- Missing authorization
- Transport request invalid
- Package doesn't support ABAP Cloud (for cloud scenarios)
- Table name length issues (max 16 chars for draft table calculation)

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}

**💡 Troubleshooting:**
1. Verify table exists: \`adt_read_source({ object_name: "${args.table_name}", object_type: "TABL" })\`
2. Check table has key fields (MANDT, primary keys)
3. Verify package authorization
4. Ensure transport request is open and assigned to you
5. Check table name length (should be <= 13 chars to allow for draft table suffix)
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_generate_custom_query': {
        const options = {};
        if (args.input_parameters) options.inputParameters = args.input_parameters;
        if (args.output_fields) options.outputFields = args.output_fields;
        if (args.create_service) options.createService = args.create_service;
        if (args.service_name) options.serviceName = args.service_name;
        
        const result = await adtService.generateCustomQuery(
          args.entity_name,
          args.query_class_name,
          args.description,
          args.package_name,
          args.transport_request || '',
          options
        );

        let responseText;
        if (result.success) {
          responseText = `🔍 **Custom Query Generated Successfully!**

**Entity:** ${result.entityName}
**Query Class:** ${result.queryClassName}
**Package:** ${args.package_name}
**Transport:** ${args.transport_request || 'Local ($TMP)'}

## 📦 Generated Artifacts

${result.createdArtifacts.map((artifact, i) => `${i + 1}. ✅ **${artifact}**`).join('\n')}

---

## 🎯 Next Steps

${result.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

---

## 💡 **Implement Query Logic**

Edit the query provider class \`${result.queryClassName}\` and implement the \`if_rap_query_provider~select\` method:

\`\`\`abap
METHOD if_rap_query_provider~select.
  
  " 1. Get filter parameters
  TRY.
      DATA(filter_conditions) = io_request->get_filter( )->get_as_ranges( ).
      " Extract your filters here
    CATCH cx_rap_query_filter_no_range.
  ENDTRY.

  " 2. Your custom logic here
  " - Call external APIs
  " - Complex queries across multiple tables
  " - Real-time calculations
  " - Machine learning predictions
  
  DATA lt_result TYPE STANDARD TABLE OF ${result.entityName.toLowerCase()}.
  
  " Example: SELECT with filters
  " SELECT ... INTO TABLE @lt_result.
  
  " 3. Return results
  io_response->set_data( lt_result ).
  
  " 4. Optional: Set total count
  IF io_request->is_total_numb_of_rec_requested( ).
    io_response->set_total_number_of_records( lines( lt_result ) ).
  ENDIF.

ENDMETHOD.
\`\`\`

---

## 🔧 **Test Your Query**

1. Open the abstract entity \`${result.entityName}\` in Eclipse
2. Right-click → Data Preview (F8)
3. Or create a service binding and test via OData

---

## 📚 **Use Cases**

Perfect for:
- ✅ External API integrations
- ✅ Complex multi-table aggregations
- ✅ Real-time calculations
- ✅ Machine learning integrations
- ✅ Custom business logic
- ✅ Combining data from multiple sources

**Status:** 🎉 **Ready to implement your custom logic!**
`;
        } else {
          responseText = `❌ **Failed to Generate Custom Query**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Entity name already exists
- Query class name conflicts
- Transport request invalid
- Package authorization issues
- Invalid field definitions

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}

**💡 Troubleshooting:**
1. Check entity name is unique and follows ZCE_* convention
2. Verify query class name doesn't exist
3. Ensure package and transport are valid
4. Check field type syntax (e.g., "abap.char(20)")
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_read_source': {
        const result = await adtService.readSource(args.object_name, args.object_type);
        
        // DEBUG: Show which system was used
        const systemInfo = `\n\n---\n**🔍 DEBUG INFO:**\n- **System:** ${SAP_CONFIG.baseUrl}\n- **Auth Mode:** ${SAP_CONFIG.authMode}\n- **Client:** ${SAP_CONFIG.client}`;
        
        let responseText;
        if (result.success) {
          const functionGroupInfo = result.functionGroup ? `\n**Function Group:** ${result.functionGroup}` : '';
          responseText = `✅ **Successfully Read ${result.objectType} ${result.objectName}**${functionGroupInfo}

\`\`\`abap
${result.source}
\`\`\`

**Source Code Length:** ${result.source.length} characters${systemInfo}
`;
        } else {
          responseText = `❌ **Failed to Read ${args.object_type} ${args.object_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

Possible reasons:
- Object does not exist
- No read authorization
- Invalid object type${systemInfo}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_save_source': {
        // Lock, save, check workflow (KEEP LOCKED for batch activation)
        let lockHandle = null;
        const steps = [];

        try {
          // Step 1: Lock
          const lockResult = await adtService.lockObject(args.object_name, args.object_type);
          steps.push({ step: 'lock', result: lockResult });
          
          if (!lockResult.success) {
            throw new Error(`Lock failed: ${lockResult.error}`);
          }
          
          lockHandle = lockResult.lockHandle;

          // Step 2: Save
          const saveResult = await adtService.saveSource(
            args.object_name,
            args.object_type,
            args.source_code,
            lockResult.lockHandle,
            lockResult.transportRequest
          );
          steps.push({ step: 'save', result: saveResult });

          if (!saveResult.success) {
            throw new Error(`Save failed: ${saveResult.error}`);
          }

          // Step 3: Check Syntax (object remains locked)
          const syntaxResult = await adtService.checkSyntax(args.object_name, args.object_type, 'inactive');
          steps.push({ step: 'syntax_check', result: syntaxResult });

          if (!syntaxResult.success) {
            throw new Error(`Syntax check failed: ${syntaxResult.error}`);
          }

          // Build response based on syntax check results
          let responseText;
          if (syntaxResult.hasErrors) {
            const errorCount = syntaxResult.messages.filter(m => m.type === 'E').length;
            const warningCount = syntaxResult.messages.filter(m => m.type === 'W').length;
            
            responseText = `⚠️ **Saved with Syntax Errors: ${args.object_type} ${args.object_name}**

**Transport Request:** ${lockResult.transportRequest}

**Steps Completed:**
1. ✅ Locked object
2. ✅ Saved source code (${args.source_code.length} characters)
3. ⚠️ Syntax check found ${errorCount} error(s), ${warningCount} warning(s)

**Messages:**
${syntaxResult.messages.slice(0, 5).map(m => {
  const icon = m.type === 'E' ? '🔴' : m.type === 'W' ? '🟡' : 'ℹ️';
  const location = m.line ? ` (Line ${m.line}${m.column ? `, Col ${m.column}` : ''})` : '';
  return `${icon} **[${m.type}]**${location}: ${m.text}`;
}).join('\n')}${syntaxResult.messages.length > 5 ? `\n... and ${syntaxResult.messages.length - 5} more` : ''}

🔒 **Object remains LOCKED** - Fix errors and save again, or unlock manually.
❌ **Cannot activate until syntax errors are fixed.**
`;
          } else {
            const warningCount = syntaxResult.messages.filter(m => m.type === 'W').length;
            responseText = `✅ **Successfully Saved ${args.object_type} ${args.object_name}**

**Transport Request:** ${lockResult.transportRequest}
**Transport User:** ${lockResult.transportUser}
**Transport Description:** ${lockResult.transportText}

**Steps Completed:**
1. ✅ Locked object
2. ✅ Saved source code (${args.source_code.length} characters)
3. ✅ Syntax check passed${warningCount > 0 ? ` (${warningCount} warning(s))` : ''}

🔒 **Object remains LOCKED** - Ready for activation!

**Next steps:**
- Use \`adt_activate\` to unlock and activate
- Or save more objects first, then activate all together (batch activation)
`;
          }

          return {
            content: [{ type: 'text', text: responseText }]
          };

        } catch (error) {
          // On error, try to unlock
          if (lockHandle) {
            try {
              await adtService.unlockObject(args.object_name, args.object_type, lockHandle);
              steps.push({ step: 'unlock', result: { success: true, message: 'Unlocked due to error' } });
            } catch (unlockError) {
              // Failed to unlock, but we're already in error state
            }
          }

          const responseText = `❌ **Failed to Save ${args.object_type} ${args.object_name}**

**Error:** ${error.message}

**Steps Attempted:**
${steps.map((s, i) => `${i + 1}. ${s.step}: ${s.result.success ? '✅' : '❌'} ${s.result.error || ''}`).join('\n')}
`;

          return {
            content: [{ type: 'text', text: responseText }]
          };
        }
      }

      case 'adt_save_testclass_source': {
        // Lock class, save test class include, check workflow (KEEP LOCKED for activation)
        let lockHandle = null;
        const steps = [];

        try {
          // Step 1: Lock the class
          const lockResult = await adtService.lockObject(args.class_name, 'CLAS');
          steps.push({ step: 'lock', result: lockResult });
          
          if (!lockResult.success) {
            throw new Error(`Lock failed: ${lockResult.error}`);
          }
          
          lockHandle = lockResult.lockHandle;
          const transportRequest = lockResult.transportRequest;

          // Step 2: Save test class include
          const saveResult = await adtService.saveTestClassInclude(
            args.class_name,
            args.source_code,
            lockHandle,
            transportRequest
          );
          steps.push({ step: 'save', result: saveResult });
          
          if (!saveResult.success) {
            throw new Error(`Save failed: ${saveResult.error}`);
          }

          // Step 3: Syntax check (test classes)
          const syntaxResult = await adtService.checkSyntax(args.class_name, 'CLAS', 'inactive');
          steps.push({ step: 'syntax_check', result: syntaxResult });

          // Step 4: Try to read back what was saved (for verification)
          const readBackResult = await adtService.readTestClassInclude(args.class_name);
          
          // Format response
          const syntaxMessages = syntaxResult.messages || [];
          const errors = syntaxMessages.filter(m => m.type === 'error');
          const warnings = syntaxMessages.filter(m => m.type === 'warning');
          
          // Parse test class structure from source code
          const testClassMatches = args.source_code.match(/CLASS\s+(\w+)\s+DEFINITION/gi) || [];
          const testMethodMatches = args.source_code.match(/METHODS\s+(\w+)\s+FOR\s+TESTING/gi) || [];

          let responseText = `✅ **Test Class Source Saved for ${args.class_name}**

**Test Class Info:**
- Test Classes Defined: ${testClassMatches.length}
- Test Methods Defined: ${testMethodMatches.length}
- Source Code Length: ${args.source_code.length} characters

**Test Classes Found:**
${testClassMatches.map(m => `  - ${m.match(/CLASS\s+(\w+)/i)[1]}`).join('\n') || '  (none)'}

**Test Methods Found:**
${testMethodMatches.map(m => `  - ${m.match(/METHODS\s+(\w+)/i)[1]}`).join('\n') || '  (none)'}

**Workflow Steps:**
1. ✅ lock (Transport: ${transportRequest || '(local)'})
2. ✅ save (test class include) - HTTP ${saveResult.httpStatus || 'Unknown'}
3. ${syntaxResult.success && errors.length === 0 ? '✅' : '❌'} syntax_check
4. ${readBackResult.success ? '✅' : '⚠️'} verification read-back

`;

          if (!readBackResult.success) {
            responseText += `\n⚠️ **Warning:** Could not read back saved test class to verify. Error: ${readBackResult.error}\n`;
          } else if (readBackResult.sourceCode?.length !== args.source_code.length) {
            responseText += `\n⚠️ **Warning:** Saved length (${readBackResult.sourceCode?.length || 0}) differs from sent length (${args.source_code.length})\n`;
          }

          if (errors.length > 0) {
            responseText += `\n❌ **Syntax Errors Found (${errors.length}):**\n`;
            errors.slice(0, 10).forEach(err => {
              responseText += `   [${err.type?.toUpperCase() || 'E'}] Line ${err.line}: ${err.message}\n`;
            });
            if (errors.length > 10) {
              responseText += `   ... and ${errors.length - 10} more errors\n`;
            }
            responseText += `\n❌ **Cannot activate due to syntax errors. Fix errors and try again.**\n`;
          } else if (warnings.length > 0) {
            responseText += `\n⚠️ **Warnings (${warnings.length}):**\n`;
            warnings.slice(0, 5).forEach(warn => {
              responseText += `   [W] Line ${warn.line}: ${warn.message}\n`;
            });
          } else {
            responseText += `\n✅ **No syntax errors!**\n`;
          }

          responseText += `\n🔒 **Object Status:** LOCKED (ready for activation)
📦 **Transport:** ${transportRequest || '(local)'}

**Next Step:**
Use \`adt_activate\` to unlock and activate the class:
\`\`\`
adt_activate({ objects: [{ name: "${args.class_name}", type: "CLAS" }] })
\`\`\`

**Debug Info:**
- Save Response Status: ${saveResult.httpStatus}
- Syntax Check Success: ${syntaxResult.success}
- Messages Count: ${syntaxMessages.length} (${errors.length} errors, ${warnings.length} warnings)
`;

          return {
            content: [{ type: 'text', text: responseText }]
          };

        } catch (error) {
          // If we still have a lock, try to unlock
          if (lockHandle) {
            try {
              await adtService.unlockObject(args.class_name, 'CLAS', lockHandle);
              steps.push({ step: 'unlock', result: { success: true } });
            } catch (unlockError) {
              // Unlock failed, but we're already in error state
            }
          }

          const responseText = `❌ **Failed to Save Test Class for ${args.class_name}**

**Error:** ${error.message}

**Steps Attempted:**
${steps.map((s, i) => `${i + 1}. ${s.step}: ${s.result.success ? '✅' : '❌'} ${s.result.error || ''}`).join('\n')}
`;

          return {
            content: [{ type: 'text', text: responseText }]
          };
        }
      }

      case 'adt_read_testclass_source': {
        const result = await adtService.readTestClassInclude(args.class_name);
        
        let responseText;
        if (result.success) {
          responseText = `✅ **Successfully Read Test Classes for ${args.class_name}**

\`\`\`abap
${result.sourceCode}
\`\`\`

**Source Code Length:** ${result.sourceCode?.length || 0} characters

**Info:** These are ABAP Unit test classes (ltcl_*) with test methods and assertions.
`;
        } else {
          responseText = `❌ **Failed to Read Test Classes for ${args.class_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Class does not exist
- Class does not have test classes defined
- No read authorization

**Hint:** Test classes are defined in the "Test Classes" tab in Eclipse ADT or SE24.
`;
        }
        
        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_read_local_implementations': {
        const result = await adtService.readLocalImplementations(args.class_name);
        
        let responseText;
        if (result.success) {
          responseText = `✅ **Successfully Read Local Implementations for ${result.className}**

\`\`\`abap
${result.sourceCode}
\`\`\`

**Source Code Length:** ${result.length} characters

**Info:** These are the handler/saver classes (lhc_*, lsc_*) for RAP behavior implementations.
`;
        } else {
          responseText = `❌ **Failed to Read Local Implementations for ${args.class_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Class does not exist
- Class does not have local implementations (not a behavior implementation class)
- No read authorization

**Hint:** ${result.hint}
`;
        }
        
        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_save_local_implementations': {
        // Lock class, save local implementations include, check workflow (KEEP LOCKED for activation)
        let lockHandle = null;
        const steps = [];

        try {
          // Step 1: Lock the class
          const lockResult = await adtService.lockObject(args.class_name, 'CLAS');
          steps.push({ step: 'lock', result: lockResult });
          
          if (!lockResult.success) {
            throw new Error(`Lock failed: ${lockResult.error}`);
          }
          
          lockHandle = lockResult.lockHandle;
          const transportRequest = lockResult.transportRequest;

          // Step 2: Save local implementations include
          const saveResult = await adtService.saveLocalImplementations(
            args.class_name,
            args.source_code,
            lockHandle,
            transportRequest
          );
          steps.push({ step: 'save', result: saveResult });
          
          if (!saveResult.success) {
            throw new Error(`Save failed: ${saveResult.error}`);
          }

          // Step 3: Syntax check
          const syntaxResult = await adtService.checkSyntax(args.class_name, 'CLAS', 'inactive');
          steps.push({ step: 'syntax_check', result: syntaxResult });

          // Format response
          const syntaxMessages = syntaxResult.messages || [];
          const errors = syntaxMessages.filter(m => m.type === 'error');
          const warnings = syntaxMessages.filter(m => m.type === 'warning');

          let responseText = `✅ **Local Implementations Saved for ${args.class_name}**

**Workflow Steps:**
1. ✅ lock
2. ✅ save (local implementations)
3. ${syntaxResult.success && errors.length === 0 ? '✅' : '❌'} syntax_check

`;

          if (errors.length > 0) {
            responseText += `\n⚠️ **Syntax Errors Found (${errors.length}):**\n`;
            errors.slice(0, 5).forEach(err => {
              responseText += `   Line ${err.line}: ${err.message}\n`;
            });
            if (errors.length > 5) {
              responseText += `   ... and ${errors.length - 5} more errors\n`;
            }
            responseText += `\n❌ **Cannot activate due to syntax errors. Fix errors and try again.**\n`;
          } else if (warnings.length > 0) {
            responseText += `\n⚠️ **Warnings (${warnings.length}):**\n`;
            warnings.slice(0, 3).forEach(warn => {
              responseText += `   Line ${warn.line}: ${warn.message}\n`;
            });
          } else {
            responseText += `\n✅ **No syntax errors!**\n`;
          }

          responseText += `\n🔒 **Object Status:** LOCKED (ready for activation)
📦 **Transport:** ${transportRequest || '(local)'}

**Next Step:**
Use \`adt_activate\` to unlock and activate the class:
\`\`\`
adt_activate({ objects: [{ name: "${args.class_name}", type: "CLAS" }] })
\`\`\`
`;

          return {
            content: [{ type: 'text', text: responseText }]
          };

        } catch (error) {
          // If we still have a lock, try to unlock
          if (lockHandle) {
            try {
              await adtService.unlockObject(args.class_name, 'CLAS', lockHandle);
              steps.push({ step: 'unlock', result: { success: true } });
            } catch (unlockError) {
              // Unlock failed, but we're already in error state
            }
          }

          const responseText = `❌ **Failed to Save Local Implementations for ${args.class_name}**

**Error:** ${error.message}

**Steps Attempted:**
${steps.map((s, i) => `${i + 1}. ${s.step}: ${s.result.success ? '✅' : '❌'} ${s.result.error || ''}`).join('\n')}
`;

          return {
            content: [{ type: 'text', text: responseText }]
          };
        }
      }

      case 'adt_check_syntax': {
        const result = await adtService.checkSyntax(
          args.object_name,
          args.object_type,
          args.version || 'inactive'
        );

        let responseText;
        if (result.success) {
          if (result.messages.length === 0) {
            responseText = `✅ **Syntax Check Passed: ${result.objectType} ${result.objectName}**

**Status:** ${result.statusText}
**Version:** ${args.version || 'inactive'}

🎉 No errors, warnings, or info messages. Code is clean!
`;
          } else {
            const errorCount = result.messages.filter(m => m.type === 'E').length;
            const warningCount = result.messages.filter(m => m.type === 'W').length;
            const infoCount = result.messages.filter(m => m.type === 'I').length;

            responseText = `${result.hasErrors ? '❌' : '⚠️'} **Syntax Check: ${result.objectType} ${result.objectName}**

**Status:** ${result.statusText}
**Version:** ${args.version || 'inactive'}
**Errors:** ${errorCount} | **Warnings:** ${warningCount} | **Info:** ${infoCount}

**Messages:**
${result.messages.map(m => {
  const icon = m.type === 'E' ? '🔴' : m.type === 'W' ? '🟡' : 'ℹ️';
  const location = m.line ? ` (Line ${m.line}${m.column ? `, Col ${m.column}` : ''})` : '';
  return `${icon} **[${m.type}]**${location}: ${m.text}`;
}).join('\n')}

${result.hasErrors ? '❌ **Cannot activate due to syntax errors.**' : '✅ **Can be activated.**'}
`;
          }
        } else {
          responseText = `❌ **Syntax Check Failed**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_check_syntax_unsaved': {
        const result = await adtService.checkSyntaxUnsaved(
          args.object_name,
          args.object_type,
          args.source_code
        );

        let responseText;
        if (result.success) {
          if (result.messages.length === 0) {
            responseText = `✅ **Unsaved Code Syntax Check Passed: ${result.objectType} ${result.objectName}**

**Status:** ${result.statusText}
**Check Type:** Unsaved (in-memory validation)

🎉 No errors, warnings, or info messages. Code is clean and ready to save!

**Next steps:**
- Save the code with \`adt_save_source\`
- Or save and activate with \`adt_update_and_activate\`
`;
          } else {
            const errorCount = result.messages.filter(m => m.type === 'E').length;
            const warningCount = result.messages.filter(m => m.type === 'W').length;
            const infoCount = result.messages.filter(m => m.type === 'I').length;

            responseText = `${result.hasErrors ? '❌' : '⚠️'} **Unsaved Code Syntax Check: ${result.objectType} ${result.objectName}**

**Status:** ${result.statusText}
**Check Type:** Unsaved (in-memory validation)
**Errors:** ${errorCount} | **Warnings:** ${warningCount} | **Info:** ${infoCount}

**Messages:**
${result.messages.map(m => {
  const icon = m.type === 'E' ? '🔴' : m.type === 'W' ? '🟡' : 'ℹ️';
  const location = m.line ? ` (Line ${m.line}${m.column ? `, Col ${m.column}` : ''})` : '';
  return `${icon} **[${m.type}]**${location}: ${m.text}`;
}).join('\n')}

${result.hasErrors ? '❌ **Fix these errors before saving!**' : '✅ **Can be saved and activated.**'}

**Recommended workflow:**
1. ${result.hasErrors ? 'Fix the errors above' : 'Code looks good!'}
2. ${result.hasErrors ? 'Re-check with adt_check_syntax_unsaved' : 'Save with adt_save_source or adt_update_and_activate'}
`;
          }
        } else {
          // Check if fallback is needed
          if (result.fallbackRequired) {
            responseText = `⚠️ **Unsaved Syntax Check Not Supported**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Your SAP system may not support in-memory syntax checking.**

**Recommended workflow:**
1. Save the code first with \`adt_save_source\`
2. Then check with \`adt_check_syntax\`
3. If errors found, fix and re-save
4. Finally activate with \`adt_activate\`

Or use \`adt_update_and_activate\` which handles errors automatically.
`;
          } else {
            responseText = `❌ **Unsaved Syntax Check Failed**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Details:**
${JSON.stringify(result.details, null, 2)}
`;
          }
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_run_tests': {
        const result = await adtService.runUnitTests(
          args.object_name,
          args.object_type || 'CLAS'
        );

        if (!result.success) {
          const responseText = `❌ **Failed to Run Tests for ${args.object_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}
`;
          return {
            content: [{ type: 'text', text: responseText }]
          };
        }

        // DEBUG: Log the raw XML response
        log(`[TEST RESULTS DEBUG] Raw XML:\n${result.rawXml?.substring(0, 2000) || 'No XML'}`);
        log(`[TEST RESULTS DEBUG] Parsed structure: ${JSON.stringify(result.parsed, null, 2).substring(0, 2000)}`);

        // Parse test results
        const runResult = result.parsed['aunit:runResult'];
        
        if (!runResult || !runResult.program) {
          const responseText = `⚠️ **Test Results for ${args.object_name}**

**Warning:** No test execution data found in response.
This could mean:
- No test classes exist in the object
- Test classes exist but have no test methods
- The object hasn't been activated properly

**Raw Response Preview:**
${result.rawXml?.substring(0, 500) || 'No response data'}
`;
          return {
            content: [{ type: 'text', text: responseText }]
          };
        }

        const program = runResult.program;
        const testClasses = Array.isArray(program.testClasses?.testClass) 
          ? program.testClasses.testClass 
          : program.testClasses?.testClass ? [program.testClasses.testClass] : [];

        let totalTests = 0;
        let passedTests = 0;
        let failedTests = 0;
        let totalTime = 0;
        const failures = [];

        // Analyze results
        testClasses.forEach(testClass => {
          const className = testClass['@_adtcore:name'];
          const testMethods = Array.isArray(testClass.testMethods?.testMethod)
            ? testClass.testMethods.testMethod
            : testClass.testMethods?.testMethod ? [testClass.testMethods.testMethod] : [];

          testMethods.forEach(method => {
            totalTests++;
            const methodName = method['@_adtcore:name'];
            const execTime = parseFloat(method['@_executionTime'] || 0);
            totalTime += execTime;

            const alerts = Array.isArray(method.alerts?.alert)
              ? method.alerts.alert
              : method.alerts?.alert ? [method.alerts.alert] : [];

            if (alerts.length > 0) {
              failedTests++;
              alerts.forEach(alert => {
                // Extract details - can be single object or array of detail objects
                let detailsText = '';
                if (alert.details?.detail) {
                  const details = Array.isArray(alert.details.detail) 
                    ? alert.details.detail 
                    : [alert.details.detail];
                  
                  detailsText = details
                    .map(d => d['@_text'] || d.text || '')
                    .filter(t => t.length > 0)
                    .join('\n   ');
                }
                
                failures.push({
                  testClass: className,
                  testMethod: methodName,
                  title: alert.title || 'Unknown error',
                  details: detailsText,
                  severity: alert['@_severity'] || 'critical'
                });
              });
            } else {
              passedTests++;
            }
          });
        });

        // Format response
        let responseText = `🧪 **Test Results for ${args.object_name}**\n\n`;
        
        if (failedTests === 0 && totalTests > 0) {
          responseText += `✅ **ALL TESTS PASSED!**\n\n`;
        } else if (totalTests === 0) {
          responseText += `⚠️ **NO TESTS FOUND**\n\n`;
        } else {
          responseText += `❌ **TESTS FAILED**\n\n`;
        }

        responseText += `**Summary:**\n`;
        responseText += `- Total Tests: ${totalTests}\n`;
        responseText += `- ✅ Passed: ${passedTests}\n`;
        responseText += `- ❌ Failed: ${failedTests}\n`;
        responseText += `- ⏱️  Total Time: ${totalTime.toFixed(3)}s\n\n`;

        // List test classes
        responseText += `**Test Classes (${testClasses.length}):**\n`;
        testClasses.forEach(testClass => {
          const className = testClass['@_adtcore:name'];
          const testMethods = Array.isArray(testClass.testMethods?.testMethod)
            ? testClass.testMethods.testMethod
            : testClass.testMethods?.testMethod ? [testClass.testMethods.testMethod] : [];
          
          const classFailures = failures.filter(f => f.testClass === className);
          const icon = classFailures.length > 0 ? '❌' : '✅';
          
          responseText += `\n${icon} **${className}** (${testMethods.length} tests)\n`;
          
          testMethods.forEach(method => {
            const methodName = method['@_adtcore:name'];
            const execTime = parseFloat(method['@_executionTime'] || 0);
            const methodFailure = failures.find(f => f.testClass === className && f.testMethod === methodName);
            const methodIcon = methodFailure ? '❌' : '✅';
            
            responseText += `  ${methodIcon} ${methodName} (${execTime.toFixed(3)}s)\n`;
          });
        });

        // Show failure details
        if (failures.length > 0) {
          responseText += `\n\n**❌ Failure Details:**\n`;
          failures.forEach((failure, index) => {
            responseText += `\n**${index + 1}. ${failure.testClass}→${failure.testMethod}**\n`;
            responseText += `   ${failure.title}\n`;
            if (failure.details) {
              responseText += `   ${failure.details}\n`;
            }
          });
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_execute_class': {
        const result = await adtService.executeClass(args.class_name);

        let responseText;
        if (result.success) {
          responseText = `✅ **Successfully Executed ${result.className} (F9)**

**Console Output:**
\`\`\`
${result.output}
\`\`\`

🎉 Class execution completed successfully!`;
        } else {
          responseText = `❌ **Failed to Execute ${args.class_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Hint:** ${result.hint || 'Check that the class implements if_oo_adt_classrun~main and is activated'}

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_activate': {
        // Unlock → Activate workflow (supports batch activation)
        const unlockResults = [];
        let unlockErrors = 0;

        // Step 1: Unlock all objects first
        for (const obj of args.objects) {
          try {
            const unlockResult = await adtService.unlockObject(obj.name, obj.type, null);
            unlockResults.push({ object: obj, result: unlockResult });
            if (!unlockResult.success) {
              unlockErrors++;
            }
          } catch (error) {
            unlockResults.push({ 
              object: obj, 
              result: { success: false, error: error.message } 
            });
            unlockErrors++;
          }
        }

        // Step 2: Activate all objects (even if some unlocks failed - they might not be locked)
        const result = await adtService.activateObjects(args.objects);

        let responseText;
        if (result.success) {
          const objectCount = args.objects.length;
          const unlockedCount = unlockResults.filter(r => r.result.success).length;
          const hasServiceBinding = args.objects.some(obj => obj.type === 'SRVB' || obj.type === 'SERVICE_BINDING');
          
          const actionWord = result.generationExecuted && hasServiceBinding ? 'Generated' : 'Activated';
          
          responseText = `✅ **Successfully ${actionWord} ${result.objectCount} Object(s)**

**Workflow Steps:**
1. 🔓 Unlocked ${unlockedCount} of ${objectCount} object(s)${unlockErrors > 0 ? ` (${unlockErrors} already unlocked)` : ''}
2. ✅ ${actionWord} ${result.objectCount} object(s)

**Check Executed:** ${result.checkExecuted ? 'Yes' : 'No'}
**Generation Executed:** ${result.generationExecuted ? 'Yes' : 'No'}

**${actionWord} Objects:**
${args.objects.map(obj => `- ${obj.type} ${obj.name}`).join('\n')}

${hasServiceBinding && result.generationExecuted ? 
  '🎉 Service binding generated successfully! Next step: Publish in SAPGUI (private cloud) or Eclipse (public cloud)' : 
  '🎉 All objects are now active and ready to use!'}
`;
        } else {
          responseText = `❌ **Activation Failed**

${result.activated === false ? '**Activation was cancelled due to errors:**' : '**Error during activation:**'}

${result.messages && result.messages.length > 0 ? 
  result.messages.map(m => {
    const icon = m.type === 'E' ? '🔴' : m.type === 'W' ? '🟡' : 'ℹ️';
    return `${icon} **[${m.type}]** ${m.objectDescription || ''} ${m.line > 0 ? `Line ${m.line}` : ''}\n   ${m.text}`;
  }).join('\n\n') : 
  `**Error:** ${result.error || 'Unknown error'}`
}

**Unlock Results:**
${unlockResults.map(r => `- ${r.object.type} ${r.object.name}: ${r.result.success ? '✅' : '⚠️ already unlocked'}`).join('\n')}

**Attempted Objects:**
${args.objects.map(obj => `- ${obj.type} ${obj.name}`).join('\n')}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_update_and_activate': {
        const result = await adtService.updateAndActivate(
          args.object_name,
          args.object_type,
          args.source_code
        );

        let responseText = `${result.success ? '✅' : '❌'} **Update and Activate: ${args.object_type} ${args.object_name}**

**Workflow Steps:**
${result.steps.map((s, i) => {
  const icon = s.result.success ? '✅' : '❌';
  let details = '';
  
  if (s.step === 'lock' && s.result.success) {
    details = ` (Transport: ${s.result.transportRequest})`;
  } else if (s.step === 'syntax_check' && s.result.success) {
    details = s.result.hasErrors 
      ? ` (${s.result.messages.length} errors found)` 
      : ' (No errors)';
  } else if (!s.result.success) {
    details = ` - ${s.result.error || 'Failed'}`;
  }
  
  return `${i + 1}. ${icon} **${s.step}**${details}`;
}).join('\n')}

`;

        if (result.success) {
          responseText += `\n🎉 **Object successfully updated and activated!**`;
        } else {
          responseText += `\n❌ **Operation failed:** ${result.error || 'See steps above for details'}`;
          
          // Add save step debug details if available
          const saveStep = result.steps.find(s => s.step === 'save');
          if (saveStep && !saveStep.result.success) {
            responseText += `\n\n**Save Error Details:**`;
            responseText += `\n- **Request URL:** ${saveStep.result.requestUrl || 'N/A'}`;
            responseText += `\n- **Lock Handle:** ${saveStep.result.lockHandle || 'N/A'}`;
            responseText += `\n- **Transport:** ${saveStep.result.transport || 'N/A'}`;
            responseText += `\n- **HTTP Status:** ${saveStep.result.httpStatus || 'N/A'}`;
            if (saveStep.result.details) {
              responseText += `\n- **SAP Response:** ${JSON.stringify(saveStep.result.details, null, 2)}`;
            }
          }
          
          // Add syntax error details if available
          const syntaxStep = result.steps.find(s => s.step === 'syntax_check');
          if (syntaxStep?.result?.messages?.length > 0) {
            responseText += `\n\n**Syntax Errors:**\n${syntaxStep.result.messages.map(m => 
              `- [${m.type}] Line ${m.line || '?'}: ${m.text}`
            ).join('\n')}`;
          }
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_where_used_list': {
        const result = await adtService.whereUsedList(
          args.object_name,
          args.object_type
        );

        let responseText = `🔍 **Where-Used List: ${args.object_type} ${args.object_name}**\n\n`;

        if (!result.success) {
          responseText += `❌ **Error:** ${result.error}\n`;
          if (result.details) {
            responseText += `\n**Details:** ${result.details}\n`;
          }
          if (result.hint) {
            responseText += `\n**Hint:** ${result.hint}\n`;
          }
          return {
            content: [{ type: 'text', text: responseText }],
            isError: true
          };
        }

        responseText += `**Total References Found:** ${result.numberOfResults}\n`;
        responseText += `**Description:** ${result.resultDescription}\n\n`;

        if (result.references && result.references.length > 0) {
          responseText += `**Referenced Objects:**\n\n`;
          
          result.references.forEach((ref, index) => {
            responseText += `${index + 1}. **${ref.name || 'Unknown'}** (${ref.type || 'N/A'})\n`;
            if (ref.uri) {
              responseText += `   - URI: \`${ref.uri}\`\n`;
            }
            if (ref.packageName) {
              responseText += `   - Package: ${ref.packageName}\n`;
            }
            if (ref.usageInformation) {
              responseText += `   - Usage: ${ref.usageInformation}\n`;
            }
            if (ref.description) {
              responseText += `   - Description: ${ref.description}\n`;
            }
            responseText += `\n`;
          });
        } else {
          responseText += `✅ **No references found** - This object is not used anywhere in the system.\n`;
        }

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_reassign_package': {
        const result = await adtService.reassignPackage(
          args.object_name,
          args.object_type,
          args.current_package,
          args.new_package,
          args.transport_request,
          args.description
        );

        let responseText = `📦 **Package Reassignment: ${args.object_type} ${args.object_name}**\n\n`;

        if (!result.success) {
          responseText += `❌ **Error:** ${result.error}\n`;
          if (result.details) {
            responseText += `\n**Details:** ${result.details}\n`;
          }
          if (result.hint) {
            responseText += `\n**Hint:** ${result.hint}\n`;
          }
          if (result.rawError) {
            responseText += `\n**Raw Error Response:**\n\`\`\`\n${typeof result.rawError === 'string' ? result.rawError : JSON.stringify(result.rawError, null, 2)}\n\`\`\`\n`;
          }
          return {
            content: [{ type: 'text', text: responseText }],
            isError: true
          };
        }

        responseText += `✅ ${result.message}\n\n`;
        responseText += `**Object:** ${result.objectName}\n`;
        responseText += `**Type:** ${result.objectType}\n`;
        responseText += `**Old Package:** ${result.oldPackage}\n`;
        responseText += `**New Package:** ${result.newPackage}\n`;
        responseText += `**Transport Request:** ${result.transportRequest}\n`;
        responseText += `\n✨ Package reassignment completed successfully!\n`;

        return {
          content: [{ type: 'text', text: responseText }]
        };
      }

      case 'adt_unlock': {
        // Unlock workflow (supports batch unlocking)
        const unlockResults = [];
        let unlockedCount = 0;
        let alreadyUnlockedCount = 0;
        let errorCount = 0;

        // Unlock all objects
        for (const obj of args.objects) {
          try {
            // Use provided lockHandle if available, otherwise try with null
            // (ADT may support unlocking without lockHandle if user owns the lock)
            const lockHandle = obj.lock_handle || null;
            const unlockResult = await adtService.unlockObject(obj.name, obj.type, lockHandle);
            
            unlockResults.push({ object: obj, result: unlockResult });
            
            if (unlockResult.success) {
              unlockedCount++;
            } else {
              // If unlock failed, it might be because object is already unlocked
              // (which is fine - treat as success for user convenience)
              // Check if error suggests object is not locked
              const errorLower = (unlockResult.error || '').toLowerCase();
              if (errorLower.includes('not locked') || 
                  errorLower.includes('no lock') || 
                  errorLower.includes('already unlocked') ||
                  unlockResult.httpStatus === 404) {
                alreadyUnlockedCount++;
              } else {
                errorCount++;
              }
            }
          } catch (error) {
            unlockResults.push({ 
              object: obj, 
              result: { 
                success: false, 
                error: error.message,
                httpStatus: error.response?.status
              } 
            });
            errorCount++;
          }
        }

        let responseText;
        const totalObjects = args.objects.length;
        
        if (errorCount === 0) {
          // All successful (including already unlocked)
          responseText = `✅ **Successfully Processed ${totalObjects} Object(s)**

**Results:**
- 🔓 Unlocked: ${unlockedCount} object(s)
- ✅ Already unlocked: ${alreadyUnlockedCount} object(s)

**Unlocked Objects:**
${unlockResults.filter(r => r.result.success).map(r => `- ${r.object.type} ${r.object.name}`).join('\n')}

${alreadyUnlockedCount > 0 ? `**Already Unlocked Objects:**\n${unlockResults.filter(r => !r.result.success && (r.result.error || '').toLowerCase().includes('not locked') || (r.result.error || '').toLowerCase().includes('no lock')).map(r => `- ${r.object.type} ${r.object.name}`).join('\n')}\n` : ''}

🎉 All objects are now unlocked and ready for modification by other users or sessions!
`;
        } else {
          // Some errors occurred
          responseText = `⚠️ **Unlock Completed with Issues**

**Results:**
- 🔓 Successfully unlocked: ${unlockedCount} object(s)
- ✅ Already unlocked: ${alreadyUnlockedCount} object(s)
- ❌ Errors: ${errorCount} object(s)

**Detailed Results:**
${unlockResults.map(r => {
  if (r.result.success) {
    return `✅ ${r.object.type} ${r.object.name} - Unlocked successfully`;
  } else {
    const errorLower = (r.result.error || '').toLowerCase();
    if (errorLower.includes('not locked') || errorLower.includes('no lock') || errorLower.includes('already unlocked')) {
      return `✅ ${r.object.type} ${r.object.name} - Already unlocked`;
    } else {
      return `❌ ${r.object.type} ${r.object.name} - ${r.result.error || 'Failed to unlock'}`;
    }
  }
}).join('\n')}

**Objects with Errors:**
${unlockResults.filter(r => {
  if (r.result.success) return false;
  const errorLower = (r.result.error || '').toLowerCase();
  return !errorLower.includes('not locked') && !errorLower.includes('no lock') && !errorLower.includes('already unlocked');
}).map(r => `- ${r.object.type} ${r.object.name}: ${r.result.error || 'Unknown error'}`).join('\n')}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }],
          isError: errorCount > 0
        };
      }

      case 'adt_remove_objects_from_transport': {
        const result = await adtService.removeObjectsFromTransport(
          args.transport_number,
          args.objects
        );

        let responseText;
        if (!result.success) {
          responseText = `❌ **Failed to Remove Objects from Transport ${args.transport_number}**

**Error:** ${result.error}
`;
          if (result.details) {
            responseText += `\n**Details:** ${JSON.stringify(result.details, null, 2)}\n`;
          }
          if (result.hint) {
            responseText += `\n**Hint:** ${result.hint}\n`;
          }
          return {
            content: [{ type: 'text', text: responseText }],
            isError: true
          };
        }

        // Build summary
        const totalObjects = result.results.length;
        const successCount = result.results.filter(r => r.success).length;
        const errorCount = result.results.filter(r => !r.success).length;

        if (errorCount === 0) {
          // All successful
          responseText = `✅ **Successfully Removed ${successCount} Object(s) from Transport ${args.transport_number}**

**Removed Objects:**
${result.results.map(r => `- ✅ ${r.object} (Status: ${r.status})`).join('\n')}

🎉 All objects have been removed from the transport successfully!
`;
        } else {
          // Some errors occurred
          responseText = `⚠️ **Removal Completed with Issues**

**Transport:** ${args.transport_number}
**Results:**
- ✅ Successfully removed: ${successCount} object(s)
- ❌ Errors: ${errorCount} object(s)

**Detailed Results:**
${result.results.map(r => {
  if (r.success) {
    return `✅ ${r.object} - Removed successfully (Status: ${r.status})`;
  } else {
    return `❌ ${r.object} - ${r.error || 'Failed to remove'}`;
  }
}).join('\n')}

**Objects with Errors:**
${result.results.filter(r => !r.success).map(r => `- ${r.object}: ${r.error || 'Unknown error'}${r.httpStatus ? ` (HTTP ${r.httpStatus})` : ''}`).join('\n')}
`;
        }

        return {
          content: [{ type: 'text', text: responseText }],
          isError: errorCount > 0
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ **Error:** ${error.message}\n\n${error.stack}`
      }],
      isError: true
    };
  }
});

// Start server
async function main() {
  console.error('═══════════════════════════════════════════════════');
  console.error('🚀 Starting ABAP ADT MCP Server');
  console.error('═══════════════════════════════════════════════════');
  console.error(`📡 Base URL: ${SAP_CONFIG.baseUrl}`);
  console.error(`🔐 Auth Mode: ${SAP_CONFIG.authMode.toUpperCase()}`);
  console.error(`👤 Client: ${SAP_CONFIG.client}`);
  if (SAP_CONFIG.authMode === 'basic') {
    console.error(`👤 User: ${SAP_CONFIG.username}`);
  } else {
    console.error(`🍪 Cookies File: ${SAP_CONFIG.btpCookiesFile}`);
  }
  console.error(`🌐 Language: ${SAP_CONFIG.language}`);
  console.error('═══════════════════════════════════════════════════');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('✅ ADT MCP Server ready for connections');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

