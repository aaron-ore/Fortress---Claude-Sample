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

  let requestBody: any = {};
  const contentType = req.headers.get('content-type');
  const contentLength = req.headers.get('content-length');

  const isJsonContentType = contentType && contentType.includes('application/json');
  const isBodyEmpty = contentLength === '0' || contentLength === null || contentLength === undefined;

  if (isJsonContentType) {
    if (isBodyEmpty) {
      console.warn('Edge Function: Received Content-Type: application/json with empty/missing Content-Length. Treating body as empty JSON object.');
      requestBody = {};
    } else {
      try {
        requestBody = await req.json();
        console.log('Edge Function: Successfully parsed request body:', JSON.stringify(requestBody, null, 2));
      } catch (parseError: any) {
        console.error('Edge Function: JSON parse error:', parseError.message);
        return new Response(JSON.stringify({ error: `Failed to parse request data as JSON: ${parseError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    }
  } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    console.error('Edge Function: Unsupported Content-Type or missing for a body-expecting method:', contentType);
    return new Response(JSON.stringify({ error: `Unsupported request format. Expected application/json for this method.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: `Unauthorized: ${userError?.message || 'User not authenticated.'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, organizations(shopify_access_token, shopify_store_name)')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData?.organization_id || !profileData.organizations?.shopify_access_token || !profileData.organizations?.shopify_store_name) {
      return new Response(JSON.stringify({ error: 'Shopify integration not fully set up for this user/organization.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const organizationId = profileData.organization_id;
    const shopifyAccessToken = profileData.organizations.shopify_access_token;
    const shopifyStoreName = profileData.organizations.shopify_store_name;

    const shopifyApiBaseUrl = `https://${shopifyStoreName}/admin/api/2024-07`; // Use latest stable API version
    const headers = {
      'X-Shopify-Access-Token': shopifyAccessToken,
      'Content-Type': 'application/json',
    };

    // Fetch products from Shopify
    const shopifyProductsResponse = await fetch(`${shopifyApiBaseUrl}/products.json?limit=250`, { headers });
    if (!shopifyProductsResponse.ok) {
      const errorData = await shopifyProductsResponse.json();
      console.error('Shopify API error fetching products:', errorData);
      throw new Error(`Failed to fetch products from Shopify: ${errorData.errors || shopifyProductsResponse.statusText}`);
    }
    const shopifyProductsData = await shopifyProductsResponse.json();
    const shopifyProducts = shopifyProductsData.products;

    // Fetch existing inventory items to identify updates vs. new inserts
    const { data: existingInventoryItems, error: existingInvError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, name, description, sku, category, picking_bin_quantity, overstock_quantity, quantity, reorder_level, picking_reorder_level, committed_stock, incoming_stock, unit_cost, retail_price, folder_id, picking_bin_folder_id, tags, notes, status, last_updated, image_url, vendor_id, barcode_url, auto_reorder_enabled, auto_reorder_quantity, shopify_product_id, shopify_variant_id')
      .eq('organization_id', organizationId);

    if (existingInvError) throw existingInvError;

    const existingInventoryMap = new Map<string, any>(); // Map by shopify_variant_id
    existingInventoryItems.forEach(item => {
      if (item.shopify_variant_id) {
        existingInventoryMap.set(String(item.shopify_variant_id), item);
      }
    });

    const itemsToInsert = [];
    const itemsToUpdate = [];
    const syncResults = [];

    for (const product of shopifyProducts) {
      for (const variant of product.variants) {
        const existingItem = existingInventoryMap.get(String(variant.id));

        const defaultCategory = product.product_type || 'Uncategorized';
        const defaultFolder = 'Unassigned'; // Assuming a default folder for new items

        // Attempt to find or create category
        let categoryId: string | undefined;
        const { data: existingCategory, error: catError } = await supabaseAdmin
          .from('categories')
          .select('id')
          .eq('name', defaultCategory)
          .eq('organization_id', organizationId)
          .single();
        if (catError && catError.code !== 'PGRST116') throw catError; // PGRST116 means no rows found
        
        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const { data: newCategory, error: newCatError } = await supabaseAdmin
            .from('categories')
            .insert({ name: defaultCategory, organization_id: organizationId, user_id: user.id })
            .select('id')
            .single();
          if (newCatError) throw newCatError;
          categoryId = newCategory.id;
        }

        // Attempt to find or create default folder
        let folderId: string | undefined;
        const { data: existingFolder, error: folderError } = await supabaseAdmin
          .from('inventory_folders')
          .select('id')
          .eq('name', defaultFolder)
          .eq('organization_id', organizationId)
          .single();
        if (folderError && folderError.code !== 'PGRST116') throw folderError;

        if (existingFolder) {
          folderId = existingFolder.id;
        } else {
          const { data: newFolder, error: newFolderError } = await supabaseAdmin
            .from('inventory_folders')
            .insert({ name: defaultFolder, color: '#CCCCCC', organization_id: organizationId, user_id: user.id })
            .select('id')
            .single();
          if (newFolderError) throw newFolderError;
          folderId = newFolder.id;
        }

        const totalQuantity = variant.inventory_quantity || 0;
        const pickingBinQuantity = existingItem?.picking_bin_quantity || Math.min(totalQuantity, 10); // Default to 10 or total
        const overstockQuantity = existingItem?.overstock_quantity || Math.max(0, totalQuantity - pickingBinQuantity);
        const reorderLevel = existingItem?.reorder_level || 0; // Keep existing reorder level or default to 0

        const itemPayload = {
          name: product.title + (variant.title !== 'Default Title' ? ` - ${variant.title}` : ''),
          description: product.body_html || '',
          sku: variant.sku || `SHOPIFY-${variant.id}`,
          category: defaultCategory,
          picking_bin_quantity: pickingBinQuantity,
          overstock_quantity: overstockQuantity,
          quantity: totalQuantity, // Shopify's total quantity
          reorder_level: reorderLevel,
          picking_reorder_level: Math.min(reorderLevel, pickingBinQuantity), // Ensure picking reorder is not higher than picking bin
          committed_stock: 0, // Shopify doesn't provide this directly, assume 0
          incoming_stock: 0, // Shopify doesn't provide this directly, assume 0
          unit_cost: parseFloat(variant.price || '0') * 0.7 || 0, // Estimate unit cost as 70% of retail price
          retail_price: parseFloat(variant.price || '0') || 0,
          folder_id: folderId,
          picking_bin_folder_id: folderId, // For simplicity, use same folder for both
          status: totalQuantity > reorderLevel ? "In Stock" : (totalQuantity > 0 ? "Low Stock" : "Out of Stock"),
          last_updated: new Date().toISOString(),
          image_url: product.image?.src || null,
          vendor_id: null, // Shopify doesn't provide vendor ID directly
          barcode_url: variant.barcode || variant.sku || String(variant.id),
          user_id: user.id,
          organization_id: organizationId,
          auto_reorder_enabled: false, // Default to false
          auto_reorder_quantity: 0, // Default to 0
          shopify_product_id: String(product.id),
          shopify_variant_id: String(variant.id),
        };

        if (existingItem) {
          // Only update quantity and status if different, and other fields if they are empty in Fortress
          const updatedFields: any = {
            quantity: itemPayload.quantity,
            picking_bin_quantity: itemPayload.picking_bin_quantity,
            overstock_quantity: itemPayload.overstock_quantity,
            status: itemPayload.status,
            last_updated: itemPayload.last_updated,
          };

          // Update other fields only if they are empty in Fortress or explicitly provided by Shopify
          if (!existingItem.name || existingItem.name === existingItem.sku) updatedFields.name = itemPayload.name;
          if (!existingItem.description) updatedFields.description = itemPayload.description;
          if (!existingItem.category || existingItem.category === 'Uncategorized') updatedFields.category = itemPayload.category;
          if (!existingItem.image_url) updatedFields.image_url = itemPayload.image_url;
          if (!existingItem.barcode_url || existingItem.barcode_url === existingItem.sku) updatedFields.barcode_url = itemPayload.barcode_url;
          if (existingItem.retail_price === 0) updatedFields.retail_price = itemPayload.retail_price;
          if (existingItem.unit_cost === 0) updatedFields.unit_cost = itemPayload.unit_cost;
          if (!existingItem.folder_id || existingItem.folder_id === 'Unassigned') updatedFields.folder_id = itemPayload.folder_id;
          if (!existingItem.picking_bin_folder_id || existingItem.picking_bin_folder_id === 'Unassigned') updatedFields.picking_bin_folder_id = itemPayload.picking_bin_folder_id;


          itemsToUpdate.push({ id: existingItem.id, ...updatedFields });
          syncResults.push({ shopifyProductId: product.id, shopifyVariantId: variant.id, status: 'updated' });
        } else {
          itemsToInsert.push(itemPayload);
          syncResults.push({ shopifyProductId: product.id, shopifyVariantId: variant.id, status: 'inserted' });
        }
      }
    }

    let insertCount = 0;
    let updateCount = 0;

    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('inventory_items')
        .insert(itemsToInsert);
      if (insertError) {
        console.error('Error inserting Shopify products:', insertError);
        throw new Error(`Failed to insert new Shopify products: ${insertError.message}`);
      }
      insertCount = itemsToInsert.length;
    }

    if (itemsToUpdate.length > 0) {
      for (const updateItem of itemsToUpdate) {
        const { id, ...fieldsToUpdate } = updateItem;
        const { error: updateError } = await supabaseAdmin
          .from('inventory_items')
          .update(fieldsToUpdate)
          .eq('id', id);
        if (updateError) {
          console.error(`Error updating Shopify product ${id}:`, updateError);
          // Don't throw, just log and continue for other updates
        } else {
          updateCount++;
        }
      }
    }

    return new Response(JSON.stringify({
      message: `Shopify sync complete. Inserted ${insertCount} new products, updated ${updateCount} existing products.`,
      results: syncResults,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});