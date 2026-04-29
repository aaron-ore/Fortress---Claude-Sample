import { createClient } from 'npm:@supabase/supabase-js';
import * as XLSX from 'npm:xlsx'; // Import XLSX for CSV parsing
import { serve } from "https://deno.land/std@0.200.0/http/server.ts"; // Explicitly import serve
// Inlined corsHeaders to avoid module resolution issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define an interface for existing inventory items to provide type safety
interface ExistingInventoryItem {
  id: string;
  name: string;
  sku: string;
  picking_bin_quantity: number;
  overstock_quantity: number;
  quantity: number; // Total quantity
}

serve(async (req) => { // Changed Deno.serve to serve
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { filePath, organizationId, userId, actionForDuplicates } = await req.json();

    if (!filePath || !organizationId || !userId || !actionForDuplicates) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: filePath, organizationId, userId, actionForDuplicates.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Corrected: Extract token from Authorization header and use auth.admin.getUser
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUser(token);

    if (userError || !user || user.id !== userId) { // Added user.id !== userId check
      console.error('Edge Function: JWT verification failed or user mismatch:', userError?.message || 'User not found or ID mismatch');
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or mismatched user token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 1. Download CSV from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('csv-uploads') // Assuming a bucket named 'csv-uploads'
      .download(filePath);

    if (downloadError) {
      console.error('Error downloading file from storage:', downloadError);
      return new Response(JSON.stringify({ error: `Failed to download CSV file: ${downloadError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 2. Read and parse CSV
    const buffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return new Response(JSON.stringify({ error: 'The CSV file is empty or contains no data rows.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const newItemsToInsert: any[] = [];
    const itemsToUpdate: any[] = [];
    const errors: string[] = [];

    // Fetch existing categories, folders, and inventory items for validation and updates
    const { data: existingCategories, error: catError } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('organization_id', organizationId);
    if (catError) throw catError;
    const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]));

    const { data: existingFolders, error: folderError } = await supabaseAdmin // Changed to existingFolders
      .from('inventory_folders') // Changed table name
      .select('id, name')
      .eq('organization_id', organizationId);
    if (folderError) throw folderError;
    const folderMap = new Map(existingFolders.map(f => [f.name.toLowerCase(), f.id])); // Changed to folderMap

    const { data: existingInventoryRaw, error: invError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, name, sku, picking_bin_quantity, overstock_quantity, quantity')
      .eq('organization_id', organizationId);
    if (invError) throw invError;
    
    // Explicitly type existingInventoryMap
    const existingInventoryMap: Map<string, ExistingInventoryItem> = new Map(
      existingInventoryRaw.map((i: any) => [i.sku.toLowerCase(), i as ExistingInventoryItem])
    );

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // Assuming header is row 1

      const itemName = String(row.name || '').trim();
      const sku = String(row.sku || '').trim();

      // --- Strict Validation for Required Fields ---
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
      // --- End Strict Validation ---

      // --- Optional Fields Handling ---
      const description = String(row.description || '').trim() || undefined;
      const imageUrl = String(row.imageUrl || '').trim() || undefined;
      const vendorId = String(row.vendorId || '').trim() || undefined;
      const barcodeUrl = String(row.barcodeUrl || '').trim() || sku; // Default to SKU if not provided
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

      let categoryName = String(row.category || '').trim();
      if (!categoryName) categoryName = 'Uncategorized'; // Default category
      if (!categoryMap.has(categoryName.toLowerCase())) {
        const { data: newCat, error: insertCatError } = await supabaseAdmin
          .from('categories')
          .insert({ name: categoryName, organization_id: organizationId, user_id: user.id }) // Use user.id
          .select('id, name')
          .single();
        if (insertCatError) {
          errors.push(`Row ${rowNumber} (SKU: ${sku}): Failed to create category '${categoryName}': ${insertCatError.message}`);
          continue;
        }
        categoryMap.set(newCat.name.toLowerCase(), newCat.id);
      }

      let folderName = String(row.folderName || '').trim(); // Changed from mainLocationString to folderName
      if (!folderName) folderName = 'Unassigned'; // Default folder
      let folderId: string | undefined = folderMap.get(folderName.toLowerCase()); // Get folderId from map

      if (!folderId) { // If folder doesn't exist, create it
        const { data: newFolder, error: insertFolderError } = await supabaseAdmin // Changed to newFolder
          .from('inventory_folders') // Changed table name
          .insert({
            name: folderName,
            color: '#CCCCCC', // Default color for new folders
            organization_id: organizationId,
            user_id: user.id,
          })
          .select('id, name')
          .single();
        if (insertFolderError) {
          errors.push(`Row ${rowNumber} (SKU: ${sku}): Failed to create folder '${folderName}': ${insertFolderError.message}`); // Changed to folder
          continue;
        }
        folderId = newFolder.id;
        folderMap.set(newFolder.name.toLowerCase(), newFolder.id); // Add to map
      }

      // For simplicity, picking_bin_location will also use the same folder_id for now
      const pickingBinFolderId = folderId;

      const existingItem = existingInventoryMap.get(sku.toLowerCase());
      const totalQuantity = pickingBinQuantity + overstockQuantity;
      const status = totalQuantity > reorderLevel ? "In Stock" : (totalQuantity > 0 ? "Low Stock" : "Out of Stock");

      const itemPayload = {
        name: itemName,
        description: description,
        sku: sku,
        category: categoryName,
        picking_bin_quantity: pickingBinQuantity,
        overstock_quantity: overstockQuantity,
        reorder_level: reorderLevel,
        picking_reorder_level: pickingReorderLevel,
        committed_stock: committedStock,
        incoming_stock: incomingStock,
        unit_cost: unitCost,
        retail_price: retailPrice,
        folder_id: folderId, // Changed to folder_id
        picking_bin_location: pickingBinFolderId, // Still using this column for now, but it will store folder_id
        status: status,
        last_updated: new Date().toISOString(),
        image_url: imageUrl,
        vendor_id: vendorId,
        barcode_url: barcodeUrl,
        user_id: user.id, // Safely access user.id here
        organization_id: organizationId,
        auto_reorder_enabled: autoReorderEnabled,
        auto_reorder_quantity: autoReorderQuantity,
      };

      if (existingItem) {
        if (actionForDuplicates === "skip") {
          errors.push(`Row ${rowNumber} (SKU: ${sku}): Skipped due to duplicate entry confirmation.`);
          continue;
        } else if (actionForDuplicates === "add_to_stock") {
          // Add quantities to existing stock
          const updatedPickingBinQty = existingItem.picking_bin_quantity + pickingBinQuantity;
          const updatedOverstockQty = existingItem.overstock_quantity + overstockQuantity;
          itemsToUpdate.push({
            id: existingItem.id,
            picking_bin_quantity: updatedPickingBinQty,
            overstock_quantity: updatedOverstockQty,
            quantity: updatedPickingBinQty + updatedOverstockQty, // Update total quantity
            status: (updatedPickingBinQty + updatedOverstockQty) > reorderLevel ? "In Stock" : ((updatedPickingBinQty + updatedOverstockQty) > 0 ? "Low Stock" : "Out of Stock"),
            last_updated: new Date().toISOString(),
          });
          // Log stock movement for the addition
          await supabaseAdmin.from('stock_movements').insert({
            item_id: existingItem.id,
            item_name: existingItem.name,
            type: 'add',
            amount: pickingBinQuantity + overstockQuantity,
            old_quantity: existingItem.quantity,
            new_quantity: updatedPickingBinQty + updatedOverstockQty,
            reason: 'CSV Bulk Import - Added to stock',
            user_id: user.id, // Safely access user.id here
            organization_id: organizationId,
            folder_id: folderId, // Added folder_id to stock movement
          });
        } else if (actionForDuplicates === "update") {
          // Overwrite existing item with new data from CSV
          itemsToUpdate.push({ id: existingItem.id, ...itemPayload, quantity: totalQuantity }); // Ensure total quantity is updated
        }
      } else {
        newItemsToInsert.push({ ...itemPayload, quantity: totalQuantity }); // Ensure total quantity is set for new items
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

  } catch (error: any) { // Explicitly type as 'any' to allow flexible access
    console.error('Edge Function error:', error);
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
      // This handles PostgrestError which has a 'message' property
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});