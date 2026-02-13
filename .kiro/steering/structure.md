# Project Structure

## Root Level
```
├── client/          # React frontend application
├── server/          # Express backend application
├── .kiro/           # Kiro configuration and specs
├── I18N_GUIDE.md    # Internationalization documentation
├── I18N_SETUP.md    # i18n setup instructions
└── TRANSLATION_KEYS.md
```

## Client Structure (`client/src/`)
```
├── components/      # React components
│   ├── ui/         # Reusable UI components (map, etc.)
│   ├── Admin.tsx
│   ├── Staff.tsx
│   ├── Voting.tsx
│   ├── Results.tsx
│   ├── Login.tsx
│   ├── Profile.tsx
│   ├── Elections.tsx
│   ├── Candidates.tsx
│   ├── Announcements.tsx
│   ├── Rules.tsx
│   ├── Resources.tsx
│   ├── Landing.tsx
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── AccessibilityWidget.tsx
│   └── SplashScreen.tsx
├── services/        # API communication
│   └── api.ts      # Axios instance and API calls
├── i18n/           # Internationalization
│   ├── config.ts
│   ├── en.json     # English translations
│   └── ph.json     # Filipino translations
├── constants/      # Application constants
│   └── branches.ts
├── types.ts        # TypeScript type definitions
├── lib/            # Utility functions
│   └── utils.ts
├── utils/          # Feature-specific utilities
│   └── pdfGenerator.tsx
├── context/        # React context (empty, for future use)
├── assets/         # Static images and logos
├── App.tsx         # Main app component with routing
└── main.tsx        # React entry point
```

## Server Structure (`server/`)
```
├── config/         # Configuration files
│   ├── db.js       # MongoDB connection
│   ├── jwt.js      # JWT configuration
│   └── multer.js   # File upload configuration
├── models/         # Mongoose schemas
│   ├── user.model.js
│   ├── election.model.js
│   ├── position.model.js
│   ├── candidate.model.js
│   ├── vote.model.js
│   ├── announcement.model.js
│   ├── rule.model.js
│   ├── report.model.js
│   ├── activity.model.js
│   ├── verification.model.js
│   ├── support.model.js
│   └── index.js    # Model exports
├── controllers/    # Route handlers
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── election.controller.js
│   ├── position.controller.js
│   ├── candidate.controller.js
│   ├── vote.controller.js
│   ├── announcement.controller.js
│   ├── rule.controller.js
│   ├── report.controller.js
│   ├── activity.controller.js
│   ├── verification.controller.js
│   └── support.controller.js
├── routes/         # Express route definitions
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── election.routes.js
│   ├── position.routes.js
│   ├── candidate.routes.js
│   ├── vote.routes.js
│   ├── announcement.routes.js
│   ├── rule.routes.js
│   ├── report.routes.js
│   ├── activity.routes.js
│   ├── verification.routes.js
│   └── support.routes.js
├── middleware/     # Express middleware
│   ├── auth.middleware.js      # JWT verification
│   ├── role.middleware.js      # Role-based access control
│   └── validation.middleware.js # Input validation
├── uploads/        # File storage
│   └── elections/  # Election image uploads
├── server.js       # Express app setup and entry point
├── seed.js         # Database seeding script
└── .env            # Environment variables
```

## Code Organization Patterns

### Controllers
- Async/await pattern for database operations
- Try-catch error handling
- Consistent response format: `{ message, data }`
- Activity logging for important actions

### Models
- Mongoose schemas with validation
- Pre-save hooks for data transformation (e.g., password hashing)
- Instance methods for business logic (e.g., `comparePassword`)
- Timestamps enabled on all models
- Custom JSON transformation to exclude sensitive fields

### Middleware
- Authentication: Verify JWT and attach user to request
- Authorization: Check user role before allowing access
- Validation: Joi schema validation for request bodies

### Components (React)
- Functional components with hooks
- Props-based data flow
- Navigation via `onNavigate` callback pattern
- Accessibility features integrated (high contrast, font size)
- Responsive design with Tailwind CSS

### API Communication
- Centralized Axios instance in `services/api.ts`
- Base URL from environment variables
- JWT token in Authorization header
- Error handling at service layer
