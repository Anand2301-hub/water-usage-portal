# Water Usage Monitoring and Conservation Portal
Node.js + Express + MongoDB Atlas (Mongoose) + Bootstrap 5 + Chart.js.
## Run
1. `npm install`
2. Copy `.env.example` to `.env` and fill MONGODB_URI (your Atlas password), JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
3. In Atlas: Network Access -> allow your IP
4. `npm run seed` (creates admin + demo user demo@example.com / Demo@1234 with sample data)
5. `npm run dev` then open http://localhost:3000
Never commit `.env`.
## AI features (optional)
Add `ANTHROPIC_API_KEY` to `.env` for AI Smart entry and AI Coach. Without a key, Smart entry uses rule-based estimates and the Coach gives rule-based tips. Forecast, streak and usage alerts use statistics and need no key.
