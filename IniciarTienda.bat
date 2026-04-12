@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo    GESTOR DE TIENDA LOCAL - SISTEMA DE ARRANQUE
echo ===================================================
echo.

:: 1. Verificar si Node.js está instalado
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js en este equipo.
    echo Por favor, instala Node.js desde: https://nodejs.org/
    echo Selecciona la version "LTS" para mayor estabilidad.
    pause
    exit /b
)

:: 2. Verificar dependencias
if not exist "node_modules\" (
    echo [INFO] Instalando componentes necesarios por primera vez...
    echo Esto puede tardar un par de minutos dependiendo de tu internet.
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Hubo un problema instalando los componentes. Revisa tu conexion.
        pause
        exit /b
    )
)

:: 3. Asegurar Base de Datos sincronizada
echo [INFO] Verificando integridad de la base de datos...
if not exist ".env" (
    echo [WARN] No se encontro el archivo .env. Creando configuracion local...
    echo DATABASE_URL="file:./prisma/dev.db" > .env
)

call npx prisma db push
if !errorlevel! neq 0 (
    echo.
    echo [ERROR] No se pudo sincronizar la base de datos local. 
    echo Esto puede pasar si la base de datos esta abierta en otro programa.
    echo.
    pause
    exit /b
)

call npx prisma generate
if !errorlevel! neq 0 (
    echo [ERROR] Hubo un fallo al generar el cliente de base de datos.
    pause
    exit /b
)

:: 4. Abrir navegador
echo [INFO] Abriendo aplicacion en el navegador...
start http://localhost:3000

:: 5. Iniciar Servidor
echo.
echo ===================================================
echo   EL SERVIDOR ESTA LISTO Y CORRIENDO
echo ===================================================
echo.
echo [ATENCION] No cierres esta ventana mientras uses el sistema.
echo Para apagar el sistema, simplemente cierra esta ventana.
echo.
echo Acceso manual: http://localhost:3000
echo ===================================================
echo.

call npm run dev

pause
