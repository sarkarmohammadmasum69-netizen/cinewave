# CineWave — Render Free ডেমো (কার্ড লাগে না)

ডেমো মাত্র — Render Free-এ ডিস্ক ephemeral, তাই restart / ১৫ মিনিট idle-তে ঘুমিয়ে গেলে / redeploy-এ SQLite ডাটাবেস আর আপলোড করা মুভি মুছে যাবে। আসল লাইব্রেরির জন্য VPS লাগবে।

## ১. GitHub-এ কোড তোলো (৫ মিনিট)
1. github.com-এ গিয়ে New repository → নাম `cinewave` → Public → Create।
2. এই zip-টা extract করে, সেই ফোল্ডার থেকে:
```bash
git init
git add .
git commit -m "CineWave demo"
git branch -M main
git remote add origin https://github.com/TOMAR-USERNAME/cinewave.git
git push -u origin main
```
`.env` কখনো push করো না — `.gitignore`-এ সেটা আগেই বাদ দেওয়া আছে।

## ২. Render-এ ডেপ্লয় করো
1. render.com → Sign up (GitHub দিয়ে, কার্ড লাগে না)।
2. Dashboard → **New → Web Service** → GitHub repo `cinewave` বাছো।
3. `render.yaml` নিজেই ধরা পড়বে: plan **Free**, build `npm install`, start `npm start`।
4. Environment Variables-এ **ADMIN_PASSWORD**-এ নিজের শক্তিশালী পাসওয়ার্ড বসাও। SESSION_SECRET Render নিজে বানিয়ে দেবে।
5. **Create Web Service** → build হতে ২–৩ মিনিট লাগবে।
6. প্রথম ভিজিটে ~১ মিনিট লাগতে পারে — ফ্রি সার্ভিস ঘুম থেকে জাগে।

## ৩. চেক করো
- সাইট: `https://cinewave-xxxx.onrender.com`
- Admin: `https://cinewave-xxxx.onrender.com/admin.html` (username `admin` + তোমার পাসওয়ার্ড)
- ছোট একটা টেস্ট মুভি আপলোড করে প্লেব্যাক দেখো। ডেমোতে 100 MB পর্যন্ত আপলোড সেট করা আছে।

## মনে রাখো
- ১৫ মিনিট কেউ না এলে সাইট ঘুমাবে, পরের ভিজিটর ~১ মিনিট অপেক্ষা করবে।
- মুভি/ডাটা হারালে আবার আপলোড করতে হবে — এটা ডেমোর সীমা, বাগ না।
- শুধু নিজের বা অনুমতি পাওয়া ভিডিও আপলোড করো।
