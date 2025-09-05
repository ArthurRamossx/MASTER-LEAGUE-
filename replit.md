# Overview

Master League is a sports betting application focused on eFootball 2026 competitions. The application provides a dual-interface system where regular users can place bets on games, while administrators can manage games, odds, and bet statuses through a secure admin panel. The system tracks betting activity, calculates potential winnings, and provides comprehensive reporting capabilities for administrators.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built using React with TypeScript, utilizing a modern component-based architecture. The application uses shadcn/ui components built on top of Radix UI primitives for consistent and accessible UI components. The styling system is based on Tailwind CSS with custom CSS variables for theming support.

**Key Frontend Decisions:**
- **Component Library**: shadcn/ui chosen for its flexibility and accessibility features
- **State Management**: TanStack Query for server state management, providing caching and synchronization
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Styling**: Tailwind CSS with CSS custom properties for theme customization

## Backend Architecture
The backend follows a REST API architecture built with Express.js and TypeScript. The application uses a modular approach with separate route handlers and storage abstraction layers.

**Key Backend Decisions:**
- **Framework**: Express.js chosen for its simplicity and extensive middleware ecosystem
- **Storage Pattern**: Abstract storage interface (IStorage) allowing for flexible data persistence strategies
- **Current Implementation**: In-memory storage for development, designed to be easily replaceable with database persistence
- **API Design**: RESTful endpoints with clear separation between admin and user functionalities

## Database and Storage
The application is configured to use PostgreSQL with Drizzle ORM for type-safe database operations. The schema defines three main entities: users, games, and bets with proper relationships and constraints.

**Storage Decisions:**
- **ORM**: Drizzle chosen for its TypeScript-first approach and performance characteristics
- **Database**: PostgreSQL for robust relational data management
- **Schema Design**: Clear separation of concerns with proper foreign key relationships
- **Migration Support**: Drizzle Kit for database schema migrations

## Authentication and Authorization
The system implements a simple admin authentication mechanism using password-based login for administrative functions.

**Security Decisions:**
- **Admin Access**: Password-based authentication for administrative functions
- **Session Management**: Basic session handling for admin authentication
- **Route Protection**: API endpoints protected based on user roles

## Data Validation and Type Safety
The application emphasizes type safety throughout the stack using TypeScript and Zod for runtime validation.

**Validation Strategy:**
- **Schema Definition**: Shared TypeScript types between client and server
- **Runtime Validation**: Zod schemas for API request/response validation
- **Database Validation**: Drizzle schema validation at the database layer

# External Dependencies

## Core Framework Dependencies
- **React 18**: Frontend framework with modern hooks and concurrent features
- **Express.js**: Backend web framework for REST API development
- **TypeScript**: Type-safe development across the entire stack

## Database and ORM
- **PostgreSQL**: Primary database (configured via Neon Database serverless)
- **Drizzle ORM**: Type-safe database toolkit and query builder
- **Drizzle Kit**: Database migration and schema management tool

## UI and Styling
- **Radix UI**: Headless UI primitives for accessible components
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Utility for creating variant-based component APIs

## Development and Build Tools
- **Vite**: Frontend build tool and development server
- **ESBuild**: Fast JavaScript bundler for production builds
- **TSX**: TypeScript execution engine for development

## State Management and Data Fetching
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **Zod**: Schema validation and type inference

## Additional Utilities
- **Date-fns**: Date manipulation and formatting
- **CLSX/CN**: Conditional className utilities
- **Wouter**: Lightweight routing for React applications