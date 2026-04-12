import storeConfig from '@/config/storeProperties.json'

export function DashboardView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-fade-in-down">
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 rounded-3xl shadow-xl max-w-4xl w-full">
        
        <div className="w-20 h-20 bg-indigo-600 dark:bg-indigo-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-600/30 transform transition hover:scale-105">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>

        <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-4 tracking-tight">
          Bienvenido a {storeConfig.storeName}
        </h2>
        
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto font-medium">
          Control absoluto de tu negocio con la mejor experiencia visual. Gestiona inventario, ventas y fiados desde un solo lugar.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full text-left">
          
          <a href="/inventory" className="group block p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom"></div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">📦 Inventario</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Organiza, ajusta precios y previsualiza tus productos listos para vender.</p>
          </a>

          <a href="/pos" className="group block p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom"></div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">🛒 Cajero (POS)</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">La terminal de punto de venta. Registra salidas, pagos en efectivo y fiados rápidos.</p>
          </a>

          <a href="/history" className="group block p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom"></div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors">📊 Estadísticas</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Visualiza gráficas de rendimiento, ganancias netas y top productos estelares.</p>
          </a>

          <a href="/debts" className="group block p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom"></div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">💸 Fiados</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Libreta digital para manejar saldos de tus clientes y liquidaciones seguras.</p>
          </a>

        </div>
      </div>
    </div>
  )
}
