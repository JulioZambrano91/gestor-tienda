import type { Metadata } from 'next'
import './globals.css'
import storeConfig from '@/config/storeProperties.json'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeToggle } from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: storeConfig.storeName,
  description: 'Gestor de Tienda Local XD',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased min-h-screen flex flex-col transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Header/Nav */}
          <header className="bg-indigo-600 dark:bg-indigo-800 text-white p-4 shadow-md transition-colors duration-300">
            <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-2xl font-bold">{storeConfig.storeName}</h1>
              <nav className="flex space-x-4 items-center">
                <a href="/" className="hover:text-indigo-200 transition-colors">Panel Principal</a>
                <a href="/inventory" className="hover:text-indigo-200 transition-colors">Inventario</a>
                <a href="/pos" className="hover:text-indigo-200 transition-colors">Cajero</a>
                <a href="/history" className="hover:text-indigo-200 transition-colors">Historial</a>
                <a href="/debts" className="hover:text-indigo-200 transition-colors">Fiados</a>
                <div className="pl-4 border-l border-indigo-500/50">
                  <ThemeToggle />
                </div>
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-grow container mx-auto p-4 max-w-7xl">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-slate-800 dark:bg-slate-950 text-slate-300 dark:text-slate-500 text-center p-4 text-sm mt-auto transition-colors duration-300">
            &copy; {new Date().getFullYear()} {storeConfig.storeName} - Gestor Local
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
