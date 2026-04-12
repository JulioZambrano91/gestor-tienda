"use client"

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Critical Application Error Caught by Boundary:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 p-8 text-center text-slate-900 dark:text-slate-100">
      <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold">¡Oops! Algo no salió como esperábamos.</h2>
      <p className="text-slate-600 dark:text-slate-400">
        Se encontró un error inesperado al cargar esta sección.
      </p>
      
      <div className="mt-4 bg-slate-100 dark:bg-slate-800 p-4 rounded text-sm text-red-500 overflow-auto max-w-2xl w-full border border-red-200 dark:border-red-900/50 shadow-inner">
        {error.message || "Error desconocido o tiempo de espera agotado."}
      </div>

      <button
        onClick={() => reset()}
        className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-md shadow-indigo-600/20"
      >
        Reintentar cargar
      </button>
    </div>
  )
}
