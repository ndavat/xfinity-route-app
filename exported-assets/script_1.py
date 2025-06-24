# First, let me create the enhanced project structure and Node.js backend
backend_structure = """
backend/
├── package.json
├── server.js
├── .env
├── routes/
│   ├── auth.js
│   ├── devices.js
│   └── router.js
├── services/
│   ├── routerService.js
│   ├── htmlParser.js
│   └── sessionManager.js
├── middleware/
│   ├── auth.js
│   └── cors.js
└── utils/
    ├── validation.js
    └── logger.js
"""

frontend_structure = """
Enhanced Frontend Structure:
├── screens/
│   ├── LoginScreen.tsx (NEW)
│   ├── DeviceDashboard.tsx (ENHANCED)
│   ├── SettingsScreen.tsx (ENHANCED)
│   └── existing screens...
├── components/
│   ├── DeviceCard.tsx (NEW)
│   ├── BlockScheduler.tsx (NEW)
│   ├── BiometricAuth.tsx (NEW)
│   ├── ModeToggle.tsx (NEW)
│   └── existing components...
├── services/
│   ├── routerApi.ts (ENHANCED)
│   ├── mockApi.ts (NEW)
│   ├── biometricAuth.ts (NEW)
│   └── secureStorage.ts (NEW)
└── utils/
    ├── deviceScheduling.ts (NEW)
    └── validation.ts (NEW)
"""

print("PROJECT STRUCTURE:")
print("==================")
print(backend_structure)
print(frontend_structure)