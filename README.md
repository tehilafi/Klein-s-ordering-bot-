# בוט הזמנות וואטסאפ למאפיית קליינס

בוט פשוט להזמנות דרך WhatsApp Business Cloud API, בנוי עם Node.js, TypeScript, Express ו-Jest.

הפרויקט לא משתמש במסד נתונים. הזמנות פעילות נשמרות זמנית בזיכרון באמצעות `Map`, ונמחקות אחרי השלמת הזמנה או ביטול.

## התקנה מקומית

```bash
npm install
cp .env.example .env
npm test
```

## הרצה מקומית

שרת Express:

```bash
npm run dev
```

מצב CLI לבדיקה בלי וואטסאפ:

```bash
npm run dev:cli
```

## פריסה ל-Render

הפרויקט כולל קובץ `render.yaml`, כך שאפשר לחבר את הריפו ל-Render כ-Blueprint או ליצור Web Service רגיל עם אותם ערכים.

הגדרות השירות:

- Runtime: `Node`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`

השרת משתמש ב-`process.env.PORT`, ו-Render מספק את הערך הזה אוטומטית.

## משתני סביבה ב-Render

להגדיר ב-Render תחת Environment:

- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

לא להעלות את `.env` לגיט. הקובץ כבר מוחרג ב-`.gitignore`.

## חיבור Webhook ב-Meta

אחרי הפריסה, Render ייתן כתובת בסגנון:

```text
https://your-service-name.onrender.com
```

ב-Meta WhatsApp Cloud API יש להגדיר:

- Callback URL: `https://your-service-name.onrender.com/webhook`
- Verify Token: אותו ערך שהוגדר ב-`WHATSAPP_VERIFY_TOKEN`

בדיקת זמינות:

```text
https://your-service-name.onrender.com/health
```
