# Technology Stack

## Frontend (Client)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 with custom animations
- **Routing**: React Router DOM 7
- **HTTP Client**: Axios
- **UI Components**: Lucide React icons, SweetAlert2 modals
- **Internationalization**: i18next with react-i18next
- **Data Visualization**: Recharts
- **PDF Export**: @react-pdf/renderer
- **Maps**: MapLibre GL
- **Animations**: Framer Motion
- **Linting**: ESLint with TypeScript support

### Client Commands
```bash
npm run dev      # Start development server (Vite HMR)
npm run build    # Build for production (TypeScript + Vite)
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Backend (Server)
- **Runtime**: Node.js
- **Framework**: Express 5
- **Database**: MongoDB with Mongoose 9
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **File Upload**: Multer
- **Validation**: Joi
- **CORS**: Enabled for client communication
- **Development**: Nodemon for auto-reload

### Server Commands
```bash
npm start   # Start production server
npm run dev # Start development server with Nodemon
npm test    # Test suite (not yet configured)
```

## Environment Configuration
- Both client and server use `.env` files for configuration
- Server: Database URL, JWT secret, PORT
- Client: API base URL

## Database
- **MongoDB**: NoSQL database for flexible schema
- **Models**: User, Election, Position, Candidate, Vote, Announcement, Rule, Report, Activity, Verification, Support
- **Connection**: Mongoose ODM with automatic connection pooling

## API Architecture
- RESTful API with Express routes
- JWT-based authentication middleware
- Role-based access control middleware
- Centralized error handling
- Static file serving for uploads (elections, profiles)
