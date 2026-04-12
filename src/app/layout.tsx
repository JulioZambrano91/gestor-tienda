import type { Metadata } from 'next'
import './globals.css'
import storeConfig from '@/config/storeProperties.json'

export const metadata: Metadata = {
  title: storeConfig.storeName,
  description: 'Gestor de Tienda Local',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen flex flex-col">
        {/* Header/Nav */}
        <header className="bg-indigo-600 text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">{storeConfig.storeName}</h1>
            <nav className="flex space-x-4">
              <a href="/" className="hover:text-indigo-200">Panel Principal</a>
              <a href="/inventory" className="hover:text-indigo-200">Inventario</a>
              <a href="/pos" className="hover:text-indigo-200">Cajero</a>
              <a href="/history" className="hover:text-indigo-200">Historial</a>
              <a href="/debts" className="hover:text-indigo-200">Fiados</a>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow container mx-auto p-4 max-w-7xl">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-slate-800 text-slate-300 text-center p-4 text-sm mt-auto">
          &copy; {new Date().getFullYear()} {storeConfig.storeName} - Gestor Local
        </footer>
      </body>
    </html>
  )
}
