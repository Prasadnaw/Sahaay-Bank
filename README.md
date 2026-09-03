# Sahaay Bank — Accessible Digital Banking (Full-Stack Architecture)

Sahaay Bank is a modern, WCAG 2.2 AAA compliant digital banking application built with complete separation between frontend and backend.

## Project Structure

```
sahaay-bank/
├── frontend/                     # Client Application
│   ├── index.html                # Semantic HTML skeleton
│   ├── css/
│   │   ├── variables.css         # Theme tokens (Light, Dark, AAA High Contrast)
│   │   ├── base.css              # Reset, focus visibility, typography
│   │   ├── toolbar.css           # Assistive tools & voice action strip
│   │   ├── components.css        # Panels, tables, switches, modals, OSK
│   │   └── upi-qr.css            # UPI keypad, PIN dots, QR scanner & viewer
│   └── js/
│       ├── config.js             # Configuration & endpoints
│       ├── api.js                # REST API service client with offline fallback
│       ├── i18n.js               # Dynamic multilingual dictionary (EN, HI, TA)
│       ├── voiceEngine.js        # Speech recognition & conversational form filling
│       ├── upiService.js         # UPI PIN keypad, security & validation
│       ├── qrService.js          # Personal QR code generator & camera scanner
│       ├── a11yToolbar.js        # Theme switcher, font zoom, safe mode, dwell clicking
│       ├── aiCompanion.js        # AI companion figure with speaking mouth animation
│       └── app.js                # Main router, session timeout & continuous a11y audit
├── backend/                      # Server & REST API
│   ├── data/
│   │   └── db.json               # JSON database (balance, statement, UPI PIN)
│   ├── controllers/              # Business logic controllers
│   ├── routes/
│   │   └── api.js                # REST route definitions
│   ├── server.js                 # Production Node.js/Express API server
│   ├── server.ps1                # Native Windows zero-dependency HTTP server
│   ├── package.json              # NPM dependencies & scripts
│   └── Dockerfile                # Production container specification
├── docs/
│   └── api-spec.md               # OpenAPI / REST API documentation
└── index.html                    # Root entry point
```

## How to Run

### Option 1: Native Windows Server (Zero Dependencies)
You can run the live REST API server immediately on Windows with no downloads required:
```powershell
powershell -ExecutionPolicy Bypass -File .\backend\server.ps1
```
Open `http://localhost:5000/` in your browser.

### Option 2: Production Node.js / Express
```bash
cd backend
npm install
npm start
```

### Option 3: Standalone Frontend
Simply open `frontend/index.html` directly in any browser. The built-in resilient client (`frontend/js/api.js`) will seamlessly manage state even without a backend!

# Sahaay-Bank