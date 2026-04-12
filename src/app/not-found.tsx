"use client"

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 p-8 text-center animate-fade-in-down">
      <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center shadow-inner">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">404</h2>
        <h3 className="text-xl font-medium text-slate-600 dark:text-slate-300">Página no encontrada</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          La sección a la que intentas acceder aún no ha sido construida o no existe. Podría ser que estemos trabajando en ella ahora mismo.
        </p>
      </div>

      <Link 
        href="/"
        className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-1 inline-flex items-center space-x-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        <span>Volver al Panel Principal</span>
      </Link>
    </div>
  )
}
