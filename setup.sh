#!/bin/bash

# ================================================
#   HRM System Setup - Linux/macOS
# ================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  HRM System Setup - Linux/macOS${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# ==================== CONFIGURATION ====================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
ACCOUNTS_FILE="$SCRIPT_DIR/accounts.txt"

# ==================== LOAD ENV ====================
if [ -f "$BACKEND_DIR/.env" ]; then
    echo -e "${GREEN}[OK]${NC} Loaded existing .env"
    source "$BACKEND_DIR/.env"
else
    echo -e "${YELLOW}[NEW]${NC} .env will be created from .env.example"
fi

# ==================== CHECK .ENV ====================
if [ ! -f "$BACKEND_DIR/.env" ]; then
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        echo -e "${GREEN}[NEW]${NC} Created .env from .env.example"
        echo ""
        echo -e "${RED}[ERROR]${NC} Please configure database settings in:"
        echo "  $BACKEND_DIR/.env"
        echo ""
        echo "Required settings:"
        echo "  DB_HOST=localhost"
        echo "  DB_PORT=5432"
        echo "  DB_USERNAME=your_db_user"
        echo "  DB_PASSWORD=your_db_password"
        echo "  DB_DATABASE=your_db_name"
        echo ""
        echo "After configuring, run this script again."
        exit 1
    else
        echo -e "${RED}[ERROR]${NC} .env.example not found"
        exit 1
    fi
fi

# Re-source env after potential creation
source "$BACKEND_DIR/.env" 2>/dev/null || true

# ==================== READ DB CONFIG ====================
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-fcvn}"
DB_PASSWORD="${DB_PASSWORD}"
DB_DATABASE="${DB_DATABASE:-hrm_system}"

# ==================== INSTALL NPM DEPENDENCIES ====================
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Installing Backend Dependencies...${NC}"
echo -e "${BLUE}================================================${NC}"

cd "$BACKEND_DIR"
npm install -f || {
    echo -e "${RED}[ERROR]${NC} Failed to install backend dependencies"
    exit 1
}

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Installing Frontend Dependencies...${NC}"
echo -e "${BLUE}================================================${NC}"

cd "$FRONTEND_DIR"
npm install -f || {
    echo -e "${RED}[ERROR]${NC} Failed to install frontend dependencies"
    exit 1
}

# ==================== CHECK DATABASE CONNECTION ====================
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Testing Database Connection...${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

cd "$BACKEND_DIR"
node scripts/test-db.mjs
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}================================================${NC}"
    echo -e "${RED}  Database Connection Failed${NC}"
    echo -e "${RED}================================================${NC}"
    echo ""
    echo "Please check your backend/.env settings:"
    echo "  DB_HOST=$DB_HOST"
    echo "  DB_PORT=$DB_PORT"
    echo "  DB_DATABASE=$DB_DATABASE"
    echo "  DB_USERNAME=$DB_USERNAME"
    echo ""
    echo "Make sure:"
    echo "  1. PostgreSQL is running"
    echo "  2. Database '$DB_DATABASE' exists"
    echo "  3. User '$DB_USERNAME' has access"
    echo ""
    echo "After fixing, run this script again."
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Database connection verified"

# ==================== SEED DATABASE ====================
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Seeding Database with Sample Data...${NC}"
echo -e "${BLUE}================================================${NC}"

cd "$BACKEND_DIR"

echo ""
echo "Creating test users for all departments..."
node scripts/create-test-users.mjs || {
    echo -e "${YELLOW}[WARNING]${NC} Some user creation may have failed, continuing..."
}

echo ""
echo "Fixing test user passwords..."
node scripts/fix-test-passwords.mjs || {
    echo -e "${YELLOW}[WARNING]${NC} Some password fixes may have failed, continuing..."
}

# ==================== CREATE ACCOUNTS FILE ====================
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Creating Accounts File...${NC}"
echo -e "${BLUE}================================================${NC}"

cat > "$ACCOUNTS_FILE" << 'EOF'
================================================
  HRM System - Test Accounts
  Generated: $(date)
================================================

SYSTEM ACCOUNTS:
--------------------------------
Username    : admin
Password    : Admin@123
Role       : ADMIN
Department : BOD

Username    : director
Password    : Admin@123
Role       : DIRECTOR
Department : BOD

IT DEPARTMENT:
--------------------------------
Username    : deptlead
Password    : Admin@123
Role       : DEPT_LEAD
Department : IT

Username    : employee
Password    : Admin@123
Role       : EMPLOYEE
Department : IT

Username    : it_support
Password    : ItPVTTemp@ItPVT1993-05-10
Role       : EMPLOYEE
Department : IT

HR DEPARTMENT:
--------------------------------
Username    : hr_lead
Password    : HrTTHTemp@HrTTH1985-03-20
Role       : DEPT_LEAD
Department : HR

Username    : hr_staff
Password    : HrNVMTemp@HrNVM1992-07-15
Role       : EMPLOYEE
Department : HR

ADMIN DEPARTMENT:
--------------------------------
Username    : admin_staff
Password    : AdminLTMTemp@AdminLTM1990-11-25
Role       : EMPLOYEE
Department : ADMIN

================================================
  PASSWORD FORMAT: empCode + Temp@ + empCode + dob
================================================
EOF

# Update date in file
sed -i "s/\$(date)/$(date)/" "$ACCOUNTS_FILE"

echo -e "${GREEN}[OK]${NC} Accounts file created: $ACCOUNTS_FILE"

# ==================== START SERVICES ====================
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Starting Services...${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}[INFO]${NC} Stopping services..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup EXIT INT TERM

# Start Backend
echo "Starting Backend Server..."
cd "$BACKEND_DIR"
npm run start:dev > /dev/null 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}[OK]${NC} Backend starting (PID: $BACKEND_PID)"

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 8

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}[ERROR]${NC} Backend failed to start"
    exit 1
fi

# Start Frontend
echo "Starting Frontend Server..."
cd "$FRONTEND_DIR"
npm start > /dev/null 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}[OK]${NC} Frontend starting (PID: $FRONTEND_PID)"

# ==================== VERIFY SETUP ====================
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Verifying Setup...${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Wait for services to initialize
sleep 10

# Check backend health
BACKEND_URL="http://localhost:8080"
HTTP_CODE=$(node -e "
const http = require('http');
http.get('${BACKEND_URL}', (res) => { console.log(res.statusCode); process.exit(0); })
    .on('error', () => { console.log('000'); process.exit(1); });
" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}[OK]${NC} Backend is running at $BACKEND_URL"
else
    echo -e "${YELLOW}[WARNING]${NC} Backend may still be starting (HTTP $HTTP_CODE)..."
fi

# Check frontend health
FRONTEND_URL="http://localhost:3000"
HTTP_CODE=$(node -e "
const http = require('http');
http.get('${FRONTEND_URL}', (res) => { console.log(res.statusCode); process.exit(0); })
    .on('error', () => { console.log('000'); process.exit(1); });
" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}[OK]${NC} Frontend is running at $FRONTEND_URL"
else
    echo -e "${YELLOW}[WARNING]${NC} Frontend may still be starting (HTTP $HTTP_CODE)..."
fi

# ==================== COMPLETE ====================
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}  SETUP COMPLETE!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}Files created:${NC}"
echo "  - $BACKEND_DIR/.env"
echo "  - $ACCOUNTS_FILE"
echo ""
echo -e "${GREEN}Services running:${NC}"
echo "  - Backend: http://localhost:8080"
echo "  - Frontend: http://localhost:3000"
echo ""
echo "View accounts: $ACCOUNTS_FILE"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop services${NC}"

# Keep script running
wait
