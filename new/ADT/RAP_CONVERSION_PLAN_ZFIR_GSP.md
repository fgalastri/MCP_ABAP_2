# RAP Conversion Plan: ZFIR_GSP_INTERFACE → Fiori App

## Original Report Flow
1. **Selection Screen** → Parameters (dates, pack size, checkboxes)
2. **Read Data** → `select_changed_data()` from FI/SD changes
3. **Process Data** → `call_cpi_ecc()` in batches
4. **Display Results** → ALV Table
5. **Cleanup** → `cleanup_db()` old records

## RAP Architecture

### 1. Database Table ✅
- **ZFIT_GSPDATA** - Already exists and RAP-ready
- UUID key, managed fields, status tracking

### 2. CDS Views
- **ZR_FIR_GSP_DATA** (R-layer) - Root view on ZFIT_GSPDATA
- **ZC_FIR_GSP_DATA** (C-layer) - Consumption view with projections

### 3. Behavior Definition
**Managed RAP with draft:**
- Standard operations: Create, Update, Delete (optional)
- Read-only mode for display
- **Custom Actions:**
  1. `readNewData` - Trigger data selection (replaces P_READ)
     - Input: start date/time, end date/time
  2. `processToGSP` - Send to CPI (replaces POST)
     - Input: pack size, break mode
  3. `cleanupOld` - Delete old records (replaces P_DEL)
     - Input: days
  4. `recalculateCredit` - Refresh credit values

### 4. Behavior Implementation (BP Class)
- Calls `ZFICL_CREDIT_MANAGEMENT` methods
- Handles input parameters
- Returns messages via reported

### 5. Service Definition & Binding
- **ZSD_FIR_GSP_DATA** - Service Definition
- **ZSB_FIR_GSP_DATA_O4** - OData V4 UI Binding

### 6. Metadata Extension (Fiori UI)
- List report layout
- Action buttons on toolbar
- Status criticality colors
- Filter fields

## Implementation Steps

1. ✅ Verify table exists and structure
2. Create R-layer CDS view
3. Create C-layer CDS view  
4. Create Behavior Definition with actions
5. Create Behavior Implementation
6. Create Service Definition
7. Create Service Binding
8. Create Metadata Extensions
9. Publish & Preview in Fiori Elements

## Field Mapping

| Report Parameter | RAP Implementation |
|-----------------|-------------------|
| P_ENDDAT/P_ENDTIM | Action parameter `EndDate/EndTime` |
| P_INIDAT/P_INITIM | Action parameter `StartDate/StartTime` |
| P_PACK | Action parameter `PackSize` |
| P_BREAK | Action parameter `BreakMode` |
| P_READ checkbox | Action button "Read New Data" |
| P_DEL checkbox | Action button "Cleanup Old Data" |
| P_DAYS | Action parameter `Days` |
| ALV Display | Fiori List Report |

## User Experience Flow

1. **Open Fiori App** → List of existing GSP data records
2. **Click "Read New Data"** → Dialog with date/time parameters → Execute
3. **View loaded data** → Status, customer, segment, timestamps
4. **Select records** → Click "Process to GSP" → Send to CPI
5. **Monitor results** → Status updates (Pending/Sent/OK/Error)
6. **Cleanup** → Click "Cleanup Old Data" → Enter days → Execute

## Advantages over Classic Report
✅ Modern UI with responsive design
✅ Real-time data refresh
✅ Better error handling & messages
✅ Multi-device support (desktop, tablet, mobile)
✅ Better filtering and sorting
✅ Draft capability (if needed)
✅ Integration with Fiori Launchpad






