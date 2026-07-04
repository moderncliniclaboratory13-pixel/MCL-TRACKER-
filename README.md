# MCL Report Tracker — Setup Guide

Yeh guide bilkul step-by-step hai. Kisi coding knowledge ki zaroorat nahi, bas instructions follow karein.

## STEP 1: Firebase Database Banayein (Free, 10 min)

1. https://console.firebase.google.com par jayein, Google account se login karein
2. "Add project" par click karein, naam dein "mcl-tracker" (ya kuch bhi), "Continue" dabate jayein, project create karein
3. Left menu mein **"Build" > "Firestore Database"** par click karein
4. "Create database" dabayein, **"Start in test mode"** choose karein (yeh sab ko read/write allow karega — abhi ke liye theek hai), location select karein (asia-south1 — Mumbai — sabse paas hai), "Enable" dabayein
5. Ab left menu mein gear icon > **"Project settings"** par jayein
6. Neeche scroll karein "Your apps" section tak, **web icon (`</>`)** par click karein
7. App ka nickname dein ("mcl-web"), "Register app" dabayein
8. Ek code snippet dikhega jisme `firebaseConfig = {...}` hai — yeh **copy** kar lein

## STEP 2: Config Paste Karein

1. Is project ke andar `src/firebase.js` file kholein
2. Jo `firebaseConfig` object hai usko apne copied wale se **replace** kar dein
3. File save kar dein

## STEP 3: GitHub Par Upload Karein

1. https://github.com par free account banayein (agar nahi hai)
2. "New repository" banayein, naam dein "mcl-tracker", "Create repository" dabayein
3. Us repository page par "uploading an existing file" link par click karein
4. Is poori `mcl-tracker` folder ke andar ke saare files/folders drag-drop karke upload kar dein
5. "Commit changes" dabayein

## STEP 4: Vercel Par Deploy Karein (Free)

1. https://vercel.com par jayein, "Sign up" > "Continue with GitHub" se account banayein
2. "Add New" > "Project" par click karein
3. Apni "mcl-tracker" repository dhoondh kar "Import" karein
4. Sab settings default rehne dein, "Deploy" dabayein
5. 1-2 minute mein ek link milega jaise `mcl-tracker.vercel.app` — yeh permanent link hai!

## STEP 5: Staff Ko Bhejein

- Yeh link WhatsApp par sab staff ko bhej dein
- Har staff apne phone mein link kholein, browser ke menu se **"Add to Home Screen"** karein — icon phone pe app jaisa aa jayega
- Sab ek hi data dekhenge, real-time update hoga

## Important Notes

- Firebase "test mode" 30 din baad khud expire ho jata hai security ke liye — us se pehle "Firestore Database > Rules" mein jakar rules update karni hongi (mujhse tab puchh sakte hain)
- Free plan (Firebase Spark + Vercel Hobby) itni chhoti lab ke liye kaafi hai, koi cost nahi aayegi
- Agar kabhi app mein changes karwane hon, mujhe naya code de sakte hain, aap sirf GitHub par files update kar denge — Vercel khud-ba-khud naya version deploy kar dega
