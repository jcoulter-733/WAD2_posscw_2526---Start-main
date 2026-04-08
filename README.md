# Yoga Booking Site

Web application for managing yoga course bookings

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root. Make sure it contains:

```env
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
ACCESS_TOKEN_SECRET=your-super-secure-secret-key
BCRYPT_SALT_ROUNDS=10
COOKIE_SECRET=another-secure-secret
```

Change `ACCESS_TOKEN_SECRET` and `COOKIE_SECRET` to strong random strings before deploying.

### 3. Seed the database

Populate the database with sample courses, sessions, and users:

```bash
npm run seed
```

This creates the following accounts:

| Role      | Username | Password  |
|-----------|----------|-----------|
| Organiser | `admin`  | `admin123` |
| Student   | `sarah`  | `password1` |
| Student   | `james`  | `password1` |

## Running the app

```bash
node index.js
```

The site will be available at [http://localhost:3000](http://localhost:3000).

## Running tests

```bash
npm test
```

## Implemented Features
- Login, Register, and Logout
- Course and Session Bookings
- Site Management (Add/Edit/Remove Courses and Sessions)
- User Management (Remove/Promote/Demote Users)
- JWT Authentication



