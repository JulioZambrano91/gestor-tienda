"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'

type BcvContextType = {
  bcvRate: number | null;
  loading: boolean;
  convertToBs: (usd: number) => string;
}

const BcvContext = createContext<BcvContextType>({
  bcvRate: null,
  loading: true,
  convertToBs: () => "0.00"
})

export function BcvProvider({ children }: { children: React.ReactNode }) {
  const [bcvRate, setBcvRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBcv() {
      try {
        const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial")
        const data = await res.json()
        if (data && data.promedio) {
          setBcvRate(data.promedio)
        }
      } catch (err) {
        console.error("No se pudo obtener el BCV:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchBcv()
  }, [])

  const convertToBs = (usd: number) => {
    if (!bcvRate) return "0.00"
    return (usd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <BcvContext.Provider value={{ bcvRate, loading, convertToBs }}>
      {children}
    </BcvContext.Provider>
  )
}

export function useBcv() {
  return useContext(BcvContext)
}
