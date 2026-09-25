# MM Tables to CDS Views Mapping Reference

**Source**: User-provided documentation  
**Date**: 2025-09-25  
**Purpose**: Complete reference for Material Management tables to CDS views mapping

## 🎯 **KEY PRINCIPLE**
- **API01 views**: For external consumption (S/4HANA Public Cloud, APIs)
- **Basic views**: For internal ABAP development
- **VDM (Virtual Data Model)**: Provides stable, upgrade-safe access
- **Clean Core**: Replace direct table access with released CDS views

---

## 📦 **MATERIAL MASTER DATA**

### Classic Tables → CDS Views
| Classic Table | Purpose | CDS Views |
|---------------|---------|-----------|
| **MARA** | Material master - general data | **I_Product** (basic view) |
| **MAKT** | Material texts | **I_ProductText** |
| **MARC** | Plant-specific data | **I_ProductPlantBasic** |
| **MARD** | Storage-location stock | **I_ProductStorageLocationBasic** |
| **MBEW** | Valuation | **I_ProductValuationBasic**, **I_ProductValuationAccounting** |
| **MVKE** | Sales data | **I_ProductSales** |
| **MLGN/MLGT** | WM inventory | - |
| **MDMA/MDIP** | MRP profile | - |

### Additional Product Views
- **I_ProductUnitsofMeasure** - Alternative UOM
- **I_ProductType** - Material type
- **I_ProductHierarchy** - Product hierarchy
- **I_ProductPurchaseTax**, **I_ProductTaxClassification** - Tax classifications
- **I_ProductGroupText** - Material group text
- **I_ProductCategoryText** - Product category description

---

## 🛒 **PURCHASING**

### Purchase Orders
| Classic Table | Purpose | CDS Views |
|---------------|---------|-----------|
| **EKKO** | PO header | **I_PurchaseOrderAPI01** |
| **EKPO** | PO item | **I_PurchaseOrderItemAPI01** |
| **EKET** | Delivery/schedule lines | **I_PurOrdScheduleLineAPI01** |
| **EKKN** | Account assignment | - |
| **EKAB** | Release documentation | - |
| **EKBE/EKBZ** | Document history/delivery costs | **I_PurchaseOrderHistoryAPI01** |

### Purchase Requisitions
| Classic Table | Purpose | CDS Views |
|---------------|---------|-----------|
| **EBAN** | Purchase requisition item | **I_PurchaseRequisitionAPI01**, **I_PurchaseRequisitionItemAPI01** |
| **EBKN** | PR account assignment | - |

### Info Records & Contracts
| Classic Table | Purpose | CDS Views |
|---------------|---------|-----------|
| **EINA/EINE** | Purchasing info record | **I_PurchasingInfoRecordAPI01** |
| **EKKO/EKPO** | Contracts & scheduling agreements | **I_PurchaseContractAPI01**, **I_PurchaseContractItemAPI01**, **I_SchedgAgrmtHdrAPI01**, **I_SchedgAgrmtItmAPI01** |

### Suppliers
| Classic Table | Purpose | CDS Views |
|---------------|---------|-----------|
| **LFA1/LFM1/LFB1** | Vendor master | **I_Supplier**, **I_BusinessPartner**, **I_SupplierCompany**, **I_SupplierWithholdingTax** |

---

## 📋 **GOODS MOVEMENT & INVENTORY**

### Material Documents
| Classic Table | Purpose | CDS Views |
|---------------|---------|-----------|
| **MATDOC/MATDOC_EXTRACT** | Material document (S/4HANA) | **I_MaterialDocumentHeader_2**, **I_MaterialDocumentItem_2** |
| **MKPF/MSEG** | Material document (obsolete) | Use **I_MaterialDocumentHeader_2**, **I_MaterialDocumentItem_2** |

### Reservations
| Classic Table | Purpose | CDS Views |
|---------------|---------|-----------|
| **RESB** | Reservation item | **I_ReservationDocumentItem** |
| **RKPF** | Reservation header | **I_ReservationDocumentHeader** |

### Physical Inventory
| Classic Table | Purpose | CDS Views |
|---------------|---------|-----------|
| **ISEG** | Physical inventory document | **I_PhysInvtryDocItem** |
| **IKPF** | Physical inventory header | **I_PhysInvtryDocHeader** |

---

## 💰 **INVOICES**

### Supplier Invoices
| Classic Table | Purpose | CDS Views |
|---------------|---------|-----------|
| **RBKP** | Invoice document header | **I_SupplierInvoiceAPI01** |
| **RSEG** | Invoice items | - |
| **RBWT/RBKPB/RBCO** | Taxes, batch details, account assignments | **I_SupplierInvoiceTaxAPI01** |

---

## 🎯 **SOLUTION FOR MATERIAL-PLANT-STORAGE CHALLENGE**

Based on this documentation, the correct approach for finding materials with multiple plants and storage locations is:

### JOIN Query Pattern:
```sql
SELECT prod.product,
       prod.producttype,
       prod.productgroup,
       plant.plant,
       storage.storagelocation
  FROM i_product AS prod
  INNER JOIN i_productplantbasic AS plant
    ON prod.product = plant.product
  INNER JOIN i_productstoragelocationbasic AS storage
    ON prod.product = storage.product
   AND plant.plant = storage.plant
 WHERE plant.plant IS NOT NULL
   AND storage.storagelocation IS NOT NULL
 ORDER BY prod.product, plant.plant, storage.storagelocation
```

### Key CDS Views for Material Analysis:
1. **I_Product** - Main product master data
2. **I_ProductPlantBasic** - Plant-specific data (replaces MARC)
3. **I_ProductStorageLocationBasic** - Storage location data (replaces MARD)

---

## 📚 **USAGE GUIDELINES**

1. **Clean Core Development**: Always use CDS views instead of direct table access
2. **API01 Views**: Use for external consumption and cloud environments
3. **Basic Views**: Use for internal ABAP development
4. **Stability**: CDS views provide C1/C2 contracts for upgrade stability
5. **Exploration**: Use ADT view browser or API.sap.com to explore metadata

---

**🚀 This reference enables proper VDM-based development following SAP's clean core principles!**
