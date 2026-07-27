@echo off
setlocal enabledelayedexpansion

echo ================================================
echo   HRM System Setup - Windows
echo ================================================
echo.

:: ==================== CONFIGURATION ====================
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
set "BACKEND_DIR=%PROJECT_ROOT%\backend"
set "FRONTEND_DIR=%PROJECT_ROOT%\frontend"
set "ACCOUNTS_FILE=%PROJECT_ROOT%\accounts.txt"

:: ==================== CHECK NODE ====================
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js ^>= 18 from https://nodejs.org/
    pause
    exit /b 1
)

:: ==================== CHECK .ENV ====================
if not exist "%BACKEND_DIR%\.env" (
    if exist "%BACKEND_DIR%\.env.example" (
        copy /Y "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
        echo [NEW] Created .env from .env.example
        echo.
        echo [INFO] Please configure database settings in: %BACKEND_DIR%\.env
        echo.
        pause
    ) else (
        echo [ERROR] .env.example not found in %BACKEND_DIR%
        pause
        exit /b 1
    )
)

:: ==================== LOAD ENV (skip comments) ====================
for /f "usebackq eol=# tokens=1,* delims==" %%a in ("%BACKEND_DIR%\.env") do (
    set "ENV_KEY=%%a"
    set "ENV_VAL=%%b"
    if defined ENV_VAL set "ENV_KEY=!ENV_KEY: =!"
    if defined ENV_VAL set "!ENV_KEY!=!ENV_VAL!"
)

:: ==================== FALLBACK DEFAULTS ====================
if not defined DB_HOST set "DB_HOST=localhost"
if not defined DB_PORT set "DB_PORT=5432"
if not defined DB_USERNAME set "DB_USERNAME=fcvn"
if not defined DB_DATABASE set "DB_DATABASE=hrm_system"

echo.
echo ================================================
echo   Loaded .env configuration
echo ================================================
echo   DB_HOST     = %DB_HOST%
echo   DB_PORT     = %DB_PORT%
echo   DB_USERNAME = %DB_USERNAME%
echo   DB_DATABASE = %DB_DATABASE%
echo.

:: ==================== INSTALL NPM DEPENDENCIES ====================
echo ================================================
echo   Installing Backend Dependencies...
echo ================================================
cd /d "%BACKEND_DIR%"
call npm install -f
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
call npm install -f
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)

:: ==================== CHECK DATABASE CONNECTION ====================
echo ================================================
echo   Testing Database Connection...
echo ================================================
echo.

cd /d "%BACKEND_DIR%"
node scripts/test-db.mjs
if errorlevel 1 (
    echo.
    echo ================================================
    echo   ERROR: Cannot connect to database
    echo ================================================
    echo.
    echo Please check your backend\.env settings.
    echo Make sure PostgreSQL is running and database/user exist.
    echo.
    echo After fixing, run this script again.
    echo.
    pause
    exit /b 1
)

echo [OK] Database connection verified
echo.

:: ==================== SEED DATABASE ====================
echo.
echo ================================================
echo   Seeding Database with Sample Data...
echo ================================================
cd /d "%BACKEND_DIR%"

:: Run database/04_seed.sql via psql to seed positions, departments, users, employees.
:: The script is idempotent: it TRUNCATEs users/employees first, then inserts
:: 4 standard accounts (admin/director/deptlead/employee) with hashes generated
:: from the empCode that the DB trigger fn_trg_employees_auto_code produces.
where psql >nul 2>&1
if errorlevel 1 (
    echo [WARNING] psql not found in PATH. Falling back to node seed scripts.
    echo Creating test users for all departments...
    call node scripts/create-test-users.mjs
    if errorlevel 1 (
        echo [WARNING] Some user creation may have failed, continuing...
    )
    echo.
    echo Fixing test user passwords...
    call node scripts/fix-test-passwords.mjs
    if errorlevel 1 (
        echo [WARNING] Some password fixes may have failed, continuing...
    )
) else (
    echo Running database/03_schema.sql via psql...
    pushd "%PROJECT_ROOT%"
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -d %DB_DATABASE% -v ON_ERROR_STOP=1 -f "database\03_schema.sql"
    set PSQL_EXIT=%errorlevel%
    popd
    if not "%PSQL_EXIT%"=="0" (
        echo.
        echo [ERROR] psql seed failed with exit code %PSQL_EXIT%.
        echo Check DB connection settings in backend\.env and PostgreSQL logs.
        pause
        exit /b 1
    )
    echo [OK] Database seeded from database/03_schema.sql
    echo Running database/04_seed.sql via psql...
    pushd "%PROJECT_ROOT%"
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -d %DB_DATABASE% -v ON_ERROR_STOP=1 -f "database\04_seed.sql"
    set PSQL_EXIT=%errorlevel%
    popd
    if not "%PSQL_EXIT%"=="0" (
        echo.
        echo [ERROR] psql seed failed with exit code %PSQL_EXIT%.
        echo Check DB connection settings in backend\.env and PostgreSQL logs.
        pause
        exit /b 1
    )
    echo [OK] Database seeded from database/04_seed.sql
    echo Running database/05_migration_annual_leave.sql via psql...
    pushd "%PROJECT_ROOT%"
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -d %DB_DATABASE% -v ON_ERROR_STOP=1 -f "database\05_migration_annual_leave.sql"
    set PSQL_EXIT=%errorlevel%
    popd
    if not "%PSQL_EXIT%"=="0" (
        echo.
        echo [ERROR] psql seed failed with exit code %PSQL_EXIT%.
        echo Check DB connection settings in backend\.env and PostgreSQL logs.
        pause
        exit /b 1
    )
    echo [OK] Database seeded from database/05_migration_annual_leave.sql
)

:: ==================== CREATE ACCOUNTS FILE ====================
echo.
echo ================================================
echo   Creating Accounts File...
echo ================================================

:: Hash chỉ từ password thuần (bcrypt) — không ghép empCode/dob.
> "%ACCOUNTS_FILE%" (
    echo ===============================================
    echo   HRM System - Test Accounts
    echo   Generated: %date% %time%
    echo ===============================================
    echo.
    echo Password hashing: bcrypt^(password^) - không có empCode/dob prefix.
    echo.
    echo ===============================================
    echo.
    echo SYSTEM ACCOUNTS:
    echo --------------------------------
    echo Username    : admin
    echo Password    : Admin@123
    echo Role        : ADMIN
    echo Department  : BOD
    echo.
    echo Username    : director
    echo Password    : Admin@123
    echo Role        : DIRECTOR
    echo Department  : BOD
    echo.
    echo IT DEPARTMENT:
    echo --------------------------------
    echo Username    : deptlead
    echo Password    : Admin@123
    echo Role        : DEPT_LEAD
    echo Department  : IT
    echo.
    echo Username    : employee
    echo Password    : Admin@123
    echo Role        : EMPLOYEE
    echo Department  : IT
    echo.
    echo ===============================================
    echo   PASSWORD FORMAT: hash^(password^)
    echo   User chỉ cần nhập đúng password như trên là login được.
    echo ===============================================
)

echo [OK] Accounts file created: %ACCOUNTS_FILE%

:: ==================== START SERVICES ====================
echo.
echo ================================================
echo   Starting Services...
echo ================================================
echo.

:: Start Backend in new window - use escaped quotes properly
echo Starting Backend Server...
start "HRM Backend" cmd /k "cd /d "%BACKEND_DIR%" && npm run start:dev"

echo Starting Frontend Server...
start "HRM Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo Services launched in separate windows.
echo Waiting 12 seconds for them to initialize...
echo.

:: Use ping for portable sleep
ping 127.0.0.1 -n 13 >nul

:: ==================== VERIFY SETUP ====================
echo ================================================
echo   Verifying Setup...
echo ================================================
echo.

set BACKEND_STATUS=000
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://localhost:8080' -UseBasicParsing -TimeoutSec 5).StatusCode } catch { 'ERR' }"') do set "BACKEND_STATUS=%%a"
if "%BACKEND_STATUS%"=="200" (
    echo [OK] Backend is running at http://localhost:8080
) else (
    echo [WARNING] Backend may still be starting... ^(HTTP %BACKEND_STATUS%^)
)

set FRONTEND_STATUS=000
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 5).StatusCode } catch { 'ERR' }"') do set "FRONTEND_STATUS=%%a"
if "%FRONTEND_STATUS%"=="200" (
    echo [OK] Frontend is running at http://localhost:5173
) else (
    echo [WARNING] Frontend may still be starting... ^(HTTP %FRONTEND_STATUS%^)
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
echo Services started in separate windows:
echo   - Backend:  http://localhost:8080
echo   - Frontend: http://localhost:5173
echo.
echo View test accounts in: accounts.txt
echo.
echo Close the Backend/Frontend windows to stop those services.
echo.
pause