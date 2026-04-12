@echo off
echo ===================================================
echo Iniciando Servidor del Gestor de Tienda Local...
echo ===================================================
echo.
echo Por favor, no cierres esta ventana negra.
echo Se abrira una pestana en tu navegador automaticamente.
echo Si no se abre, puedes entrar manualmente a: http://localhost:3000
echo.

start http://localhost:3000

echo Comprobando y descargando dependencias nuevas si hacen falta...
call npm install
echo Iniciando servidor...
call npm run dev

pause
