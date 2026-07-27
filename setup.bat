@echo off
setlocal enabledelayedexpansion

echo ================================================
echo   HRM System Setup - Windows
echo ================================================
echo.

:: ==================== CONFIGURATION ====================
set PROJECT_ROOT=%~dp0
set BACKEND_DIR=%PROJECT_ROOT%backend
set FRONTEND_DIR=%PROJECT_ROOT%frontend
set ACCOUNTS_FILE=%PROJECT_ROOT%accounts.txt

:: ==================== LOAD ENV ====================
if exist "%BACKEND_DIR%\.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%BACKEND_DIR%\.env") do (
        set "%%a=%%b"
    )
    echo [OK] Loaded existing .env
) else (
    echo [NEW] .env will be created from .env.example
)

:: ==================== CHECK .ENV ====================
if not exist "%BACKEND_DIR%\.env" (
    if exist "%BACKEND_DIR%\.env.example" (
        copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env"
        echo [NEW] Created .env from .env.example
        echo [INFO] Please edit backend\.env and configure database settings
        echo.
        powershell -Command "Write-Host 'Press Enter to continue after configuring .env...' -ForegroundColor Yellow; $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')"
    ) else (
        echo [ERROR] .env.example not found
        exit /b 1
    )
)

:: ==================== READ DB CONFIG ====================
for /f "usebackq tokens=1,* delims==" %%a in ("%BACKEND_DIR%\.env") do (
    if "%%a"=="DB_HOST" set DB_HOST=%%b
    if "%%a"=="DB_PORT" set DB_PORT=%%b
    if "%%a"=="DB_USERNAME" set DB_USERNAME=%%b
    if "%%a"=="DB_PASSWORD" set DB_PASSWORD=%%b
    if "%%a"=="DB_DATABASE" set DB_DATABASE=%%b
)

:: ==================== CHECK DATABASE CONNECTION ====================
echo.
echo ================================================
echo   Testing Database Connection...
echo ================================================
echo.

:: Try to connect using PowerShell and SqlClient
powershell -Command "
    try {
        Add-Type -AssemblyName System.Data
        $conn = New-Object System.Data.SqlClient.SqlConnection
        $conn.ConnectionString = 'Server=%DB_HOST%;Port=%DB_PORT%;Database=%DB_DATABASE%;User Id=%DB_USERNAME%;Password=%DB_PASSWORD%;'
        $conn.Open()
        $conn.Close()
        Write-Host '[OK] Database connected successfully' -ForegroundColor Green
        exit 0
    } catch {
        Write-Host '[ERROR] Cannot connect to database' -ForegroundColor Red
        Write-Host 'Error: ' $_.Exception.Message -ForegroundColor Yellow
        exit 1
    }
"

if errorlevel 1 (
    echo.
    echo ================================================
    echo   ERROR: Cannot connect to database
    echo ================================================
    echo.
    echo Please check your backend\.env settings:
    echo   DB_HOST=%DB_HOST%
    echo   DB_PORT=%DB_PORT%
    echo   DB_DATABASE=%DB_DATABASE%
    echo   DB_USERNAME=%DB_USERNAME%
    echo.
    echo Make sure:
    echo   1. PostgreSQL is running
    echo   2. Database '%DB_DATABASE%' exists
    echo   3. User '%DB_USERNAME%' has access
    echo.
    echo After fixing, run this script again.
    echo.
    pause
    exit /b 1
)

:: ==================== INSTALL NPM DEPENDENCIES ====================
echo.
echo ================================================
echo   Installing Backend Dependencies...
echo ================================================
cd /d "%BACKEND_DIR%"
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo ================================================
echo   Installing Frontend Dependencies...
echo ================================================
cd /d "%FRONTEND_DIR%"
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)

:: ==================== SEED DATABASE ====================
echo.
echo ================================================
echo   Seeding Database with Sample Data...
echo ================================================
cd /d "%BACKEND_DIR%"

:: Run the test user creation script
echo.
echo Creating test users for all departments...
node scripts/create-test-users.mjs
if errorlevel 1 (
    echo [WARNING] Some user creation may have failed, continuing...
)

:: Run password fix script
echo.
echo Fixing test user passwords...
node scripts/fix-test-passwords.mjs
if errorlevel 1 (
    echo [WARNING] Some password fixes may have failed, continuing...
)

:: ==================== CREATE ACCOUNTS FILE ====================
echo.
echo ================================================
echo   Creating Accounts File...
echo ================================================

echo ================================================ > "%ACCOUNTS_FILE%"
echo   HRM System - Test Accounts >> "%ACCOUNTS_FILE%"
echo   Generated: %date% %time% >> "%ACCOUNTS_FILE%"
echo ================================================ >> "%ACCOUNTS_FILE%"
echo. >> "%ACCOUNTS_FILE%"
echo SYSTEM ACCOUNTS: >> "%ACCOUNTS_FILE%"
echo -------------------------------- >> "%ACCOUNTS_FILE%"
echo Username    : admin >> "%ACCOUNTS_FILE%"
echo Password    : Admin@123 >> "%ACCOUNTS_FILE%"
echo Role       : ADMIN >> "%ACCOUNTS_FILE%"
echo Department : BOD >> "%ACCOUNTS_FILE%"
echo. >> "%ACCOUNTS_FILE%"
echo Username    : director >> "%ACCOUNTS_FILE%"
echo Password    : DocLM + Password@123 + 1980-05-15 >> "%ACCOUNTS_FILE%"
echo Role       : DIRECTOR >> "%ACCOUNTS_FILE%"
echo Department : BOD >> "%ACCOUNTS_FILE%"
echo. >> "%ACCOUNTS_FILE%"
echo IT DEPARTMENT: >> "%ACCOUNTS_FILE%"
echo -------------------------------- >> "%ACCOUNTS_FILE%"
echo Username    : deptlead >> "%ACCOUNTS_FILE%"
echo Password    : Password@123 >> "%ACCOUNTS_FILE%"
echo Role       : DEPT_LEAD >> "%ACCOUNTS_FILE%"
echo Department : IT >> "%ACCOUNTS_FILE%"
echo. >> "%ACCOUNTS_FILE%"
echo Username    : employee >> "%ACCOUNTS_FILE%"
echo Password    : Password@123 >> "%ACCOUNTS_FILE%"
echo Role       : EMPLOYEE >> "%ACCOUNTS_FILE%"
echo Department : IT >> "%ACCOUNTS_FILE%"
echo. >> "%ACCOUNTS_FILE%"
echo HR DEPARTMENT: >> "%ACCOUNTS_FILE%"
echo -------------------------------- >> "%ACCOUNTS_FILE%"
echo Username    : hr_lead >> "%ACCOUNTS_FILE%"
echo Password    : HrTTHTemp@HrTTH1985-03-20 >> "%ACCOUNTS_FILE%"
echo Role       : DEPT_LEAD >> "%ACCOUNTS_FILE%"
echo Department : HR >> "%ACCOUNTS_FILE%"
echo. >> "%ACCOUNTS_FILE%"
echo Username    : hr_staff >> "%ACCOUNTS_FILE%"
echo Password    : HrNVMTemp@HrNVM1992-07-15 >> "%ACCOUNTS_FILE%"
echo Role       : EMPLOYEE >> "%ACCOUNTS_FILE%"
echo Department : HR >> "%ACCOUNTS_FILE%"
echo. >> "%ACCOUNTS_FILE%"
echo ADMIN DEPARTMENT: >> "%ACCOUNTS_FILE%"
echo -------------------------------- >> "%ACCOUNTS_FILE%"
echo Username    : admin_staff >> "%ACCOUNTS_FILE%"
echo Password    : AdminLTMTemp@AdminLTM1990-11-25 >> "%ACCOUNTS_FILE%"
echo Role       : EMPLOYEE >> "%ACCOUNTS_FILE%"
echo Department : ADMIN >> "%ACCOUNTS_FILE%"
echo. >> "%ACCOUNTS_FILE%"
echo ================================================ >> "%ACCOUNTS_FILE%"
echo   PASSWORD FORMAT: empCode + Temp@ + empCode + dob >> "%ACCOUNTS_FILE%"
echo ================================================ >> "%ACCOUNTS_FILE%"

echo [OK] Accounts file created: %ACCOUNTS_FILE%

:: ==================== START SERVICES ====================
echo.
echo ================================================
echo   Starting Services...
echo ================================================
echo.

:: Start Backend in new window
echo Starting Backend Server...
start "HRM Backend" cmd /k "cd /d "%BACKEND_DIR%" && npm run start:dev"

:: Wait a bit for backend to start
timeout /t 5 /nobreak > nul

:: Start Frontend in new window
echo Starting Frontend Server...
start "HRM Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm start"

:: ==================== VERIFY SETUP ====================
echo.
echo ================================================
echo   Verifying Setup...
echo ================================================
echo.

:: Wait for services to initialize
timeout /t 10 /nobreak > nul

:: Check backend health
echo Checking Backend Health...
for /f "tokens=*" %%a in ('powershell -Command "try { (Invoke-WebRequest -Uri http://localhost:8080 -UseBasicParsing -TimeoutSec 5).StatusCode; exit 0 } catch { exit 1 }"') do set BACKEND_STATUS=%%a
if "%BACKEND_STATUS%"=="200" (
    echo [OK] Backend is running at http://localhost:8080
) else (
    echo [WARNING] Backend may still be starting...
)

:: Check frontend health
for /f "tokens=*" %%a in ('powershell -Command "try { (Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 5).StatusCode; exit 0 } catch { exit 1 }"') do set FRONTEND_STATUS=%%a
if "%FRONTEND_STATUS%"=="200" (
    echo [OK] Frontend is running at http://localhost:3000
) else (
    echo [WARNING] Frontend may still be starting...
)

:: ==================== COMPLETE ====================
echo.
echo ================================================
echo   SETUP COMPLETE!
echo ================================================
echo.
echo Files created:
echo   - backend\.env
echo   - %ACCOUNTS_FILE%
echo.
echo Services started:
echo   - Backend: http://localhost:8080
echo   - Frontend: http://localhost:3000
echo.
echo View accounts: accounts.txt
echo.
echo Press any key to exit this window...
pause > nul
