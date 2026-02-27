/**
 * Google Apps Script (code.gs)
 * 
 * Robust setup specifically designed for syncing with VendorCalc App.
 * Automatically creates sheets and missing columns.
 * Gracefully handles fresh installations by returning existing data.
 */

function doPost(e) {
  try {
    var data;
    
    // Support parsing both x-www-form-urlencoded and raw JSON Post Data
    if (e.postData.type === 'application/x-www-form-urlencoded') {
      // Decode URL encoded string if passed via 'no-cors' body stringification
      var rawString = Object.keys(e.parameter)[0]; 
      if (rawString) {
        data = JSON.parse(rawString);
      } else {
        // Fallback or explicit payload parameter mapping
        data = JSON.parse(e.parameter.payload || '{}');
      }
    } else {
      data = JSON.parse(e.postData.contents);
    }
    
    var action = data.action;
    var payload = data.payload || data;
    
    if (action === 'sync_products') {
      return syncProducts(payload.products, payload.vendorName);
    } else if (action === 'add_history') {
      return addHistory(payload);
    } else if (action === 'delete_history') {
      return deleteHistory(payload);
    } else if (action === 'get_all') {
      return getAll();
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Unknown action'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return getAll();
}

function getAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var productsSheet = getOrCreateSheet(ss, 'Products', ['ID', 'Vendor Name', 'Name', 'Price']);
  var historySheet = getOrCreateSheet(ss, 'History', ['ID', 'Vendor Name', 'Items', 'Grand Total', 'Created At']);
  
  var products = [];
  var lastRowP = productsSheet.getLastRow();
  if (lastRowP > 1) {
    var pData = productsSheet.getRange(2, 1, lastRowP - 1, 4).getValues();
    products = pData.map(function(row) {
      return { id: row[0], vendorName: row[1], name: row[2], price: row[3] };
    });
  }
  
  var history = [];
  var lastRowH = historySheet.getLastRow();
  if (lastRowH > 1) {
    var hData = historySheet.getRange(2, 1, lastRowH - 1, 5).getValues();
    history = hData.map(function(row) {
      return { 
        id: row[0], 
        vendor_name: row[1], 
        items: parseJSONSafe(row[2]), 
        grand_total: row[3], 
        created_at: row[4] 
      };
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    products: products,
    history: history
  })).setMimeType(ContentService.MimeType.JSON);
}

function syncProducts(appProducts, appVendorName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'Products', ['ID', 'Vendor Name', 'Name', 'Price']);
  
  var existingData = [];
  var lastRow = sheet.getLastRow();
  var sheetVendorName = "";

  // 1. Read existing data
  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    existingData = dataRange.map(function(row) {
      if (!sheetVendorName && row[1]) {
        sheetVendorName = row[1];
      }
      return { id: row[0], vendorName: row[1], name: row[2], price: row[3] };
    });
  }

  var finalVendorName = appVendorName || sheetVendorName || "Unknown Vendor";

  // 2. Fresh App Install Scenario
  if ((!appProducts || appProducts.length === 0) && existingData.length > 0) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true, 
      message: "Restored from cloud",
      products: existingData,
      vendorName: finalVendorName
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 3. Merge Scenario
  var mergedMap = {};
  
  existingData.forEach(function(p) {
    mergedMap[p.id] = p;
  });

  if (appProducts && appProducts.length > 0) {
    appProducts.forEach(function(p) {
      mergedMap[p.id] = {
        id: p.id,
        vendorName: finalVendorName,
        name: p.name,
        price: p.price
      };
    });
  }

  var finalProducts = Object.values(mergedMap);

  // 4. Rewrite the sheet with merged data
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  
  if (finalProducts.length > 0) {
    var rowsToInsert = finalProducts.map(function(p) {
      return [p.id, p.vendorName, p.name, p.price];
    });
    sheet.getRange(2, 1, rowsToInsert.length, 4).setValues(rowsToInsert);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Synced successfully",
    products: finalProducts,
    vendorName: finalVendorName
  })).setMimeType(ContentService.MimeType.JSON);
}

function addHistory(bill) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'History', ['ID', 'Vendor Name', 'Items', 'Grand Total', 'Created At']);
  
  sheet.appendRow([
    Number(bill.id) || Date.now(),
    bill.vendorName || "Unknown",
    JSON.stringify(bill.items || []),
    bill.grandTotal || 0,
    bill.created_at || new Date().toISOString()
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({success: true, action: "add_history"}))
    .setMimeType(ContentService.MimeType.JSON);
}

function deleteHistory(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, 'History', ['ID', 'Vendor Name', 'Items', 'Grand Total', 'Created At']);
  var targetId = Number(payload.id);
  
  if (!targetId) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'No ID provided'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({success: true, message: 'Nothing to delete'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues(); // Get just IDs
  var rowToDelete = -1;

  for (var i = 0; i < data.length; i++) {
    if (Number(data[i][0]) === targetId) {
      rowToDelete = i + 2; // +2 offset (0-index to 1-index + header row offset)
      break;
    }
  }

  if (rowToDelete > -1) {
    sheet.deleteRow(rowToDelete);
    return ContentService.createTextOutput(JSON.stringify({success: true, action: "delete_history"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Invoice not found in sheet'}))
      .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Robustly ensures a sheet exists AND has the required columns.
 */
function getOrCreateSheet(ss, name, requiredHeaders) {
  var sheet = ss.getSheetByName(name);
  
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.appendRow(requiredHeaders);
    sheet.getRange(1, 1, 1, requiredHeaders.length).setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
    return sheet;
  }

  var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var headersToAppend = [];

  requiredHeaders.forEach(function(reqHeader) {
    if (existingHeaders.indexOf(reqHeader) === -1) {
      headersToAppend.push(reqHeader);
    }
  });

  if (headersToAppend.length > 0) {
    var startCol = lastCol + 1;
    sheet.getRange(1, startCol, 1, headersToAppend.length).setValues([headersToAppend]);
    sheet.getRange(1, startCol, 1, headersToAppend.length).setFontWeight("bold").setBackground("#f3f3f3");
  }

  return sheet;
}

function parseJSONSafe(str) {
  if (!str) return [];
  try {
    return JSON.parse(str);
  } catch (e) {
    return [];
  }
}
