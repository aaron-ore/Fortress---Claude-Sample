import { createClient } from 'npm:@supabase/supabase-js';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
// Inlined corsHeaders to avoid module resolution issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to sanitize HTML content for Deno environment
const sanitizeHtml = (html: string): string => {
  let sanitized = html;

  // 1. Remove script tags
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  // 2. Remove common event handlers (e.g., onclick, onerror)
  sanitized = sanitized.replace(/(\s)(on[a-zA-Z]+)="[^"]*"/gi, '$1');
  sanitized = sanitized.replace(/(\s)(on[a-zA-Z]+)='[^"]*'/gi, '$1');

  // 3. Remove data: URLs from src/href attributes
  sanitized = sanitized.replace(/(src|href)="data:[^"]*"/gi, '$1=""');
  sanitized = sanitized.replace(/(src|href)='data:[^"]*'/gi, '$1=""');

  return sanitized;
};

interface ExistingInventoryItem {
  id: string;
  name: string;
  sku: string;
  picking_bin_quantity: number;
  overstock_quantity: number;
  quantity: number; // Total quantity
  reorder_level: number; // Added reorder_level
}

serve(async (req) => {
  let rawBodyText = ''; // Declared at a higher scope
  const contentType = req.headers.get('content-type');

  // --- START: Global Error Handling for the entire Edge Function ---
  try {
    console.log('Edge Function: Request received at top level.');

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    let requestBody: any = {};
    

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (contentType && contentType.includes('application/json')) {
        try {
          requestBody = await req.json();
          console.log('Edge Function: Successfully parsed request body via req.json():', JSON.stringify(requestBody, null, 2));
        } catch (parseError: any) {
          // If req.json() fails, it might be due to empty body or malformed JSON
          // Try to read as text for better error logging
          try {
            rawBodyText = await req.text();
          } catch (textError) {
            console.warn('Edge Function: Could not read raw body text after req.json() failure:', textError);
          }

          if (parseError instanceof SyntaxError && rawBodyText.trim() === '') {
            console.warn('Edge Function: req.json() failed with SyntaxError on empty/whitespace body. Treating as empty JSON object.');
            requestBody = {}; // Treat empty body as empty JSON object
          } else {
            console.error('Edge Function: JSON parse error for textBody:', rawBodyText, 'Error:', parseError.message);
            return new Response(JSON.stringify({ error: `Failed to parse request data as JSON: ${parseError.message}. Raw body: ${rawBodyText}` }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            });
          }
        }
      } else if (req.body) { // If there's a body but not JSON, try to read as text for logging
        try {
          rawBodyText = await req.text();
          console.warn('Edge Function: Received non-JSON body for POST/PUT/PATCH. Raw body:', rawBodyText);
        } catch (textError) {
          console.warn('Edge Function: Could not read raw body text for non-JSON body:', textError);
        }
        // For non-JSON bodies, requestBody remains {} or is handled by specific logic
      }
    }

    const { filePath, organizationId, userId, actionForDuplicates } = requestBody;

    console.log('Edge Function: Extracted filePath:', filePath);
    console.log('Edge Function: Extracted organizationId:', organizationId);
    console.log('Edge Function: Extracted userId:', userId);
    console.log('Edge Function: Extracted actionForDuplicates:', actionForDuplicates);


    if (!filePath || !organizationId || !userId || !actionForDuplicates) {
      console.error('Edge Function: Missing required parameters after parsing. filePath:', filePath, 'organizationId:', organizationId, 'userId:', userId, 'actionForDuplicates:', actionForDuplicates);
      return new Response(JSON.stringify({ error: 'Missing required parameters: filePath, organizationId, userId, actionForDuplicates.', success: false, errors: ['Missing required parameters.'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      console.error('Edge Function: Missing Supabase environment variables.');
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing Supabase environment variables.', success: false, errors: ['Server configuration error.'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Authorization header missing.', success: false, errors: ['Unauthorized.'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const token = authHeader.split(' ')[1];

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    console.log('Edge Function: Attempting to get user from token.');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user || user.id !== userId) {
      console.error('Edge Function: JWT verification failed or user mismatch:', userError?.message || 'User not found or ID mismatch');
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or mismatched user token.', success: false, errors: ['Unauthorized.'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log('Edge Function: User authenticated and matched:', user.id);
    
    console.log('Edge Function: Fetching user profile for organization ID verification.');
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id || userProfile.organization_id !== organizationId) {
      console.error('Edge Function: User profile fetch error or organization ID mismatch:', profileError?.message || 'Organization ID mismatch');
      return new Response(JSON.stringify({ error: 'Unauthorized: User does not belong to the specified organization or profile not found.', success: false, errors: ['Unauthorized.'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }
    console.log('Edge Function: User organization ID verified:', organizationId);

    console.log('Edge Function: Attempting to download file from storage:', filePath);
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('csv-uploads')
      .download(filePath);

    if (downloadError) {
      console.error('Edge Function: Error downloading file from storage:', downloadError);
      return new Response(JSON.stringify({ error: `Failed to download CSV file: ${downloadError.message}`, success: false, errors: [`Failed to download CSV file: ${downloadError.message}`] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log('Edge Function: File downloaded successfully. FileData type:', typeof fileData);

    if (!fileData) {
        console.error('Edge Function: Downloaded fileData is null or undefined.');
        throw new Error('Downloaded CSV file is empty or corrupted.');
    }

    console.log('Edge Function: Converting fileData to ArrayBuffer.');
    const buffer = await fileData.arrayBuffer();
    console.log('Edge Function: ArrayBuffer created. Size:', buffer.byteLength);

    console.log('Edge Function: Reading workbook from buffer.');
    const workbook = XLSX.read(buffer, { type: 'array' });
    console.log('Edge Function: Workbook read successfully. Sheet names:', workbook.SheetNames);

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    console.log('Edge Function: Converting worksheet to JSON.');
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
    console.log('Edge Function: Worksheet converted to JSON. Number of rows:', jsonData.length);

    if (jsonData.length === 0) {
      console.error('Edge Function: Parsed JSON data is empty.');
      return new Response(JSON.stringify({ error: 'The CSV file is empty or contains no data rows.', success: false, errors: ['CSV file is empty.'] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const newItemsToInsert: any[] = [];
    const itemsToUpdate: any[] = [];
    const errors: string[] = [];

    console.log('Edge Function: Fetching existing categories, folders, and inventory items.');
    const { data: existingCategories, error: catError } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('organization_id', organizationId);
    if (catError) throw catError;
    const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]));

    const { data: existingFolders, error: folderError } = await supabaseAdmin
      .from('inventory_folders')
      .select('id, name')
      .eq('organization_id', organizationId);
    if (folderError) throw folderError;
    const folderMap = new Map(existingFolders.map(f => [f.name.toLowerCase(), f.id]));

    const { data: existingInventoryRaw, error: invError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, name, sku, picking_bin_quantity, overstock_quantity, quantity, reorder_level')
      .eq('organization_id', organizationId);
    if (invError) throw invError;
    
    const existingInventoryMap: Map<string, ExistingInventoryItem> = new Map(
      existingInventoryRaw.map((i: any) => [i.sku.toLowerCase(), i as ExistingInventoryItem])
    );
    console.log('Edge Function: Finished fetching existing data.');

    console.log('Edge Function: Processing CSV rows.');
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2;

      // Sanitize all string inputs from CSV
      const itemName = sanitizeHtml(String(row.name || '').trim());
      const sku = sanitizeHtml(String(row.sku || '').trim());

      if (!itemName) {
        errors.push(`Row ${rowNumber} (SKU: ${sku || 'N/A'}): Item Name is required.`);
        continue;
      }
      if (!sku) {
        errors.push(`Row ${rowNumber} (Item: ${itemName}): SKU is required.`);
        continue;
      }

      let pickingBinQuantity = parseInt(String(row.pickingBinQuantity || '0'));
      if (isNaN(pickingBinQuantity) || pickingBinQuantity < 0) {
        errors.push(`Row ${rowNumber} (SKU: ${sku}): Picking Bin Quantity is required and must be a non-negative number.`);
        continue;
      }
      let overstockQuantity = parseInt(String(row.overstockQuantity || '0'));
      if (isNaN(overstockQuantity) || overstockQuantity < 0) {
        errors.push(`Row ${rowNumber} (SKU: ${sku}): Overstock Quantity is required and must be a non-negative number.`);
        continue;
      }
      let unitCost = parseFloat(String(row.unitCost || '0'));
      if (isNaN(unitCost) || unitCost < 0) {
        errors.push(`Row ${rowNumber} (SKU: ${sku}): Unit Cost is required and must be a non-negative number.`);
        continue;
      }
      let retailPrice = parseFloat(String(row.retailPrice || '0'));
      if (isNaN(retailPrice) || retailPrice < 0) {
        errors.push(`Row ${rowNumber} (SKU: ${sku}): Retail Price is required and must be a non-negative number.`);
        continue;
      }

      const description = sanitizeHtml(String(row.description || '').trim()) || undefined;
      const imageUrl = sanitizeHtml(String(row.imageUrl || '').trim()) || undefined;
      const vendorId = sanitizeHtml(String(row.vendorId || '').trim()) || undefined;
      const barcodeUrl = sanitizeHtml(String(row.barcodeUrl || '').trim()) || sku;
      const autoReorderEnabled = String(row.autoReorderEnabled || 'false').toLowerCase() === 'true';
      
      let reorderLevel = parseInt(String(row.reorderLevel || '0'));
      if (isNaN(reorderLevel) || reorderLevel < 0) reorderLevel = 0;
      let pickingReorderLevel = parseInt(String(row.pickingReorderLevel || '0'));
      if (isNaN(pickingReorderLevel) || pickingReorderLevel < 0) pickingReorderLevel = 0;
      let committedStock = parseInt(String(row.committedStock || '0'));
      if (isNaN(committedStock) || committedStock < 0) committedStock = 0;
      let incomingStock = parseInt(String(row.incomingStock || '0'));
      if (isNaN(incomingStock) || incomingStock < 0) incomingStock = 0;
      let autoReorderQuantity = parseInt(String(row.autoReorderQuantity || '0'));
      if (isNaN(autoReorderQuantity) || autoReorderQuantity < 0) autoReorderQuantity = 0;

      let categoryName = sanitizeHtml(String(row.category || '').trim());
      if (!categoryName) categoryName = 'Uncategorized';
      if (!categoryMap.has(categoryName.toLowerCase())) {
        const { data: newCat, error: insertCatError } = await supabaseAdmin
          .from('categories')
          .insert({ name: categoryName, organization_id: organizationId, user_id: user.id })
          .select('id, name')
          .single();
        if (insertCatError) {
          errors.push(`Row ${rowNumber} (SKU: ${sku}): Failed to create category '${categoryName}': ${insertCatError.message}`);
          continue;
        }
        categoryMap.set(newCat.name.toLowerCase(), newCat.id);
      }

      let folderName = sanitizeHtml(String(row.folderName || '').trim());
      if (!folderName) folderName = 'Unassigned';
      let folderId: string | undefined = folderMap.get(folderName.toLowerCase());

      if (!folderId) {
        const { data: newFolder, error: insertFolderError } = await supabaseAdmin
          .from('inventory_folders')
          .insert({
            name: folderName,
            color: '#CCCCCC',
            organization_id: organizationId,
            user_id: user.id,
          })
          .select('id, name')
          .single();
        if (insertFolderError) {
          errors.push(`Row ${rowNumber} (SKU: ${sku}): Failed to create folder '${folderName}': ${insertFolderError.message}`);
          continue;
        }
        folderId = newFolder.id;
        folderMap.set(newFolder.name.toLowerCase(), newFolder.id);
      }

      const pickingBinFolderId = folderId; 

      const existingItem = existingInventoryMap.get(sku.toLowerCase());
      const totalQuantity = pickingBinQuantity + overstockQuantity;
      const status = totalQuantity > reorderLevel ? "In Stock" : (totalQuantity > 0 ? "Low Stock" : "Out of Stock");
      const currentTimestamp = new Date().toISOString(); // Pre-calculate timestamp

      // Construct itemPayload by assigning properties one by one
      const itemPayload: { [key: string]: any } = {};
      itemPayload.name = itemName;
      itemPayload.description = description;
      itemPayload.sku = sku;
      itemPayload.category = categoryName;
      itemPayload.picking_bin_quantity = pickingBinQuantity;
      itemPayload.overstock_quantity = overstockQuantity;
      itemPayload.reorder_level = reorderLevel;
      itemPayload.picking_reorder_level = pickingReorderLevel;
      itemPayload.committed_stock = committedStock;
      itemPayload.incoming_stock = incomingStock;
      itemPayload.unit_cost = unitCost;
      itemPayload.retail_price = retailPrice;
      itemPayload.folder_id = folderId;
      itemPayload.picking_bin_folder_id = pickingBinFolderId; 
      itemPayload.status = status;
      itemPayload.last_updated = currentTimestamp; // Use pre-calculated value
      itemPayload.image_url = imageUrl;
      itemPayload.vendor_id = vendorId;
      itemPayload.barcode_url = barcodeUrl;
      itemPayload.auto_reorder_enabled = autoReorderEnabled;
      itemPayload.auto_reorder_quantity = autoReorderQuantity;

      if (existingItem) {
        if (actionForDuplicates === "skip") {
          errors.push(`Row ${rowNumber} (SKU: ${sku}): Skipped due to duplicate entry confirmation.`);
          continue;
        } else if (actionForDuplicates === "add_to_stock") {
          const updatedPickingBinQty = existingItem.picking_bin_quantity + pickingBinQuantity;
          const updatedOverstockQty = existingItem.overstock_quantity + overstockQuantity;
          itemsToUpdate.push({
            id: existingItem.id,
            picking_bin_quantity: updatedPickingBinQty,
            overstock_quantity: updatedOverstockQty,
            quantity: updatedPickingBinQty + updatedOverstockQty,
            status: (updatedPickingBinQty + updatedOverstockQty) > existingItem.reorder_level ? "In Stock" : ((updatedPickingBinQty + updatedOverstockQty) > 0 ? "Low Stock" : "Out of Stock"),
            last_updated: currentTimestamp,
          });
          await supabaseAdmin.from('stock_movements').insert({
            item_id: existingItem.id,
            item_name: existingItem.name,
            type: 'add',
            amount: pickingBinQuantity + overstockQuantity,
            old_quantity: existingItem.quantity,
            new_quantity: updatedPickingBinQty + updatedOverstockQty,
            reason: 'CSV Bulk Import - Added to stock',
            user_id: user.id,
            organization_id: organizationId,
            folder_id: folderId,
          });
        } else if (actionForDuplicates === "update") {
          itemsToUpdate.push({ id: existingItem.id, ...itemPayload, quantity: totalQuantity });
        }
      } else {
        newItemsToInsert.push({ ...itemPayload, quantity: totalQuantity, user_id: user.id, organization_id: organizationId, created_at: currentTimestamp });
      }
    }

    let insertCount = 0;
    let updateCount = 0;

    // Perform batched inserts
    if (newItemsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('inventory_items')
        .insert(newItemsToInsert);
      if (insertError) {
        errors.push(`Failed to insert new items: ${insertError.message}`);
      } else {
        insertCount = newItemsToInsert.length;
      }
    }

    // Perform batched updates
    if (itemsToUpdate.length > 0) {
      for (const updateItem of itemsToUpdate) {
        const { error: updateError } = await supabaseAdmin
          .from('inventory_items')
          .update(updateItem)
          .eq('id', updateItem.id);
        if (updateError) {
          errors.push(`Failed to update item ${updateItem.id}: ${updateError.message}`);
        } else {
          updateCount++;
        }
      }
    }

    // Clean up the uploaded CSV file from storage
    const { error: deleteFileError } = await supabaseAdmin.storage
      .from('csv-uploads')
      .remove([filePath]);

    if (deleteFileError) {
      console.warn('Error deleting uploaded CSV file from storage:', deleteFileError);
    }

    return new Response(JSON.stringify({
      message: `Bulk import complete. Inserted ${insertCount} items, updated ${updateCount} items.`,
      errors: errors,
      success: errors.length === 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: errors.length > 0 ? 400 : 200,
    });

  } catch (error: any) {
    console.error('Edge Function error (caught at top level):', error);
    let errorMessage = 'An unknown error occurred during processing.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return new Response(JSON.stringify({ error: errorMessage, success: false, errors: [errorMessage], rawBody: rawBodyText, contentType: contentType }), { // Added rawBody and contentType for debugging
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});