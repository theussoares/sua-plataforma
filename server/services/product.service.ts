// server/services/product.service.ts
import { createProductRepository } from '../repositories/product.repository'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getAll(supabase: SupabaseClient, storeId: string, options?: { query?: string; categoryId?: string; page?: number; limit?: number; includeInactive?: boolean }) {
  const repository = createProductRepository(supabase)
  return await repository.findByStore(storeId, options)
}

async function getByCategory(supabase: SupabaseClient, payload: { storeId: string, categoryId: string }) {
 const repository = createProductRepository(supabase)
 return await repository.findByCategory(payload.storeId, payload.categoryId)
}

async function getById(supabase: SupabaseClient, payload: { productId: string }) {
 const repository = createProductRepository(supabase)
 return await repository.findById(payload.productId)
}

async function getBySearch(supabase: SupabaseClient, payload: { storeId: string, query: string }) {
 const repository = createProductRepository(supabase)
 return await repository.search(payload.storeId, payload.query)
}

async function search(supabase: SupabaseClient, storeId: string, query: string) {
 const repository = createProductRepository(supabase)
 return await repository.search(storeId, query)
}

async function create(supabase: SupabaseClient, productData: Parameters<ReturnType<typeof createProductRepository>['create']>[0]) {
 const repository = createProductRepository(supabase)
 return await repository.create(productData)
}

async function update(supabase: SupabaseClient, productId: string, storeId: string, productData: Parameters<ReturnType<typeof createProductRepository>['update']>[2]) {
 const repository = createProductRepository(supabase)
 return await repository.update(productId, storeId, productData)
}

async function softDelete(supabase: SupabaseClient, productId: string, storeId: string) {
 const repository = createProductRepository(supabase)
 return await repository.softDelete(productId, storeId)
}

async function getBySpec(supabase: SupabaseClient, payload: { storeId: string, label: string, value: string }) {
 const repository = createProductRepository(supabase)
 return await repository.findBySpec(payload.storeId, payload.label, payload.value)
}

export const productService = {
 getAll,
 getByCategory,
 getById,
 getBySearch,
 search,
 create,
 update,
 softDelete,
 getBySpec,
}