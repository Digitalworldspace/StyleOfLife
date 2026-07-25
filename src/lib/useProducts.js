import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'

/**
 * Live product list. Subscribes to Postgres changes on the `products`
 * table so that ANY change — from this app, another tab, or directly
 * in the Supabase dashboard/SQL editor — is reflected instantly for
 * every connected client, without needing a refresh.
 */
export function useProducts({ category } = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('products').select('*').order('created_at', { ascending: false })
    if (category) query = query.eq('category', category)
    const { data, error } = await query
    if (error) setError(error)
    else setProducts(data)
    setLoading(false)
  }, [category])

  useEffect(() => {
    fetchProducts()

    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        setProducts((current) => {
          if (payload.eventType === 'INSERT') {
            if (category && payload.new.category !== category) return current
            if (current.some((p) => p.id === payload.new.id)) return current
            return [payload.new, ...current]
          }
          if (payload.eventType === 'UPDATE') {
            if (category && payload.new.category !== category) {
              return current.filter((p) => p.id !== payload.new.id)
            }
            return current.map((p) => (p.id === payload.new.id ? payload.new : p))
          }
          if (payload.eventType === 'DELETE') {
            return current.filter((p) => p.id !== payload.old.id)
          }
          return current
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [category, fetchProducts])

  return { products, loading, error, refetch: fetchProducts }
}
