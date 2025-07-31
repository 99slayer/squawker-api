# Squawker-api
![logo](./public/squawker-logo.png)\
Squawker is my final project for The Odin Project. It aims to replicate the core functionality of Twitter.

🚨🚨🚨\
**The live preview is hosted on a free [render](https://render.com/) instance, and may need around one minute to spin up, due to inactivity, on login.**\
🚨🚨🚨

Checkout the live preview! 👉 **[Squawker Live Preview](https://99slayer.github.io/squawker-client)**\
Checkout the front-end repo! 👉 **[Squawker-client](https://github.com/99slayer/squawker-client)**

#### Features
- RESTful API
- MongoDB object modeling using Mongoose
- User authentication/authorization with Passport.js
- Password hashing with Bcrypt
- Input validation using express-validator

#### Server Tech Stack
- NodeJS
- Express
- TypeScript
- MongoDB/Mongoose

#### Installation
To install the project locally run the following commands.
```
git clone git@github.com:99slayer/squawker-api.git
cd squawker-api
npm install
```
Start the development server with `npm run dev`

#### Usage
Create these environment variables in a `.env` file.
```
SESSION_SECRET=<session secret>
SUPA_URL=<supabase database endpoint>

// Development variables.
TEST_DB=<mongo development database connection string>
DEV_ORIGIN_1=<development frontend url 1>
DEV_ORIGIN_2=<development frontend url 2>

// Production variables.
PROD_DB=<mongo production database connection string>
PROD_ORIGIN_1=<production frontend url 1>
PROD_ORIGIN_2=<production frontend url 2>
```
This project uses a free [MongoDB](https://www.mongodb.com/) database to store/manage data.

The Squawker frontend has a seperate repo and installation process you can find [here](https://github.com/99slayer/squawker-client).
