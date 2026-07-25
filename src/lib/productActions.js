import { supabase, PRODUCT_IMAGES_BUCKET } from './supabaseClient'

function extractStoragePath(publicUrl) {
  // publicUrl looks like: https://xxx.supabase.co/storage/v1/object/public/product-images/<path>
  const marker = `/object/public/${PRODUCT_IMAGES_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return publicUrl.slice(idx + marker.length)
}

export async function uploadProductImages(files, productFolder) {
  const urls = []
  for (const file of files) {
    const ext = file.name.split('.').pop()
    const path = `${productFolder}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error
    const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path)
    urls.push(data.publicUrl)
  }
  return urls
}

export async function deleteProductImages(urls = []) {
  const paths = urls.map(extractStoragePath).filter(Boolean)
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths)
  if (error) console.error('Error deleting images from storage', error)
}

export async function createProduct(product, imageFiles) {
  const folder = crypto.randomUUID()
  let images = []
  if (imageFiles && imageFiles.length > 0) {
    images = await uploadProductImages(imageFiles, folder)
  }
  const { data, error } = await supabase
    .from('products')
    .insert([{ ...product, images }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProduct(id, updates, newImageFiles, imagesToRemove = []) {
  let images = updates.images || []

  if (imagesToRemove.length > 0) {
    await deleteProductImages(imagesToRemove)
    images = images.filter((url) => !imagesToRemove.includes(url))
  }

  if (newImageFiles && newImageFiles.length > 0) {
    const folder = crypto.randomUUID()
    const uploaded = await uploadProductImages(newImageFiles, folder)
    images = [...images, ...uploaded]
  }

  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, images })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProduct(product) {
  // Remove images from storage first, then the row.
  // Realtime subscription will propagate the delete to every connected client.
  if (product.images && product.images.length > 0) {
    await deleteProductImages(product.images)
  }
  const { error } = await supabase.from('products').delete().eq('id', product.id)
  if (error) throw error
}
