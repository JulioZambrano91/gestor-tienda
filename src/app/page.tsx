import storeConfig from '@/config/storeProperties.json'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h2 className="text-4xl font-extrabold text-indigo-700 mb-4 animate-fade-in-down">
        Bienvenido a {storeConfig.storeName}
      </h2>
      <p className="text-lg text-slate-600 mb-8 max-w-2xl">
        Utiliza el menú superior para navegar por las distintas secciones.
        Puedes gestionar tu inventario, registrar ventas en el punto de cobro (POS),
        ver historiales o administrar los fiados.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        <a href="/inventory" className="block p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Inventario</h3>
          <p className="text-slate-500 text-sm">Gestiona tus productos y categorías.</p>
        </a>
        <a href="/pos" className="block p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Cajero (POS)</h3>
          <p className="text-slate-500 text-sm">Registra nuevas ventas y pagos.</p>
        </a>
        <a href="/history" className="block p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Estadísticas</h3>
          <p className="text-slate-500 text-sm">Ingresos, márgenes y más vendidos.</p>
        </a>
        <a href="/debts" className="block p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Fiados</h3>
          <p className="text-slate-500 text-sm">Control de créditos y clientes deudores.</p>
        </a>
      </div>
    </div>
  )
}
