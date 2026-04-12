"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import storeConfig from '@/config/storeProperties.json'

type BcvContextType = {
  bcvRate: number | null;
  loading: boolean;
  convertToBs: (usd: number) => string;
  convertToUsd: (bs: number) => string;
  currencySymbol: string;
}

const BcvContext = createContext<BcvContextType>({
  bcvRate: null,
  loading: true,
  convertToBs: () => "0.00",
  convertToUsd: () => "0.00",
  currencySymbol: storeConfig.currencySymbol
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

  const convertToUsd = (bs: number) => {
    if (!bcvRate || bcvRate === 0) return "0.00"
    return (bs / bcvRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <BcvContext.Provider value={{ bcvRate, loading, convertToBs, convertToUsd, currencySymbol: storeConfig.currencySymbol }}>
      {children}
    </BcvContext.Provider>
  )
}

export function useBcv() {
  return useContext(BcvContext)
}
