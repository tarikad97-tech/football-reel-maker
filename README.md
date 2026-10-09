# Football Reel Maker — MVP

Web App لصناعة فيديوهات كرة قدم تفاعلية (9:16). القوالب الحالية: **Rank 5** و**Team Battle** و**Career Legend**.

## التشغيل
```bash
npm install
npm run dev
```
```bash
npm run build   # tsc -b && vite build
```

> الكاميرا تحتاج HTTPS أو localhost. لفتح الموقع من الهاتف أثناء التطوير:
> استخدم Chrome Android مع `chrome://inspect` (Port forwarding إلى localhost)،
> أو نفقاً HTTPS مثل `cloudflared tunnel --url http://localhost:5173`.

## البنية
```
src/
├── App.tsx               Studio ⇄ Preview
├── components/           CameraView, CameraGate, TopBar, Avatar, PlayerCard, ProgressBar, RecordButton
├── pages/                Home, Studio (Rank 5), BattleStudio, Preview
├── hooks/                useCamera, useRecorder, useTake, useRenderLoop, useRanking, useBattle
├── data/                 players, templates, teams, battles
└── utils/                canvasRenderer, battleRenderer, videoRecorder, browserSupport
```

## القوالب
- **Rank 5:** كاميرا + ميكروفون كخلفية، والمستخدم يرتب 5 لاعبين أثناء التسجيل.
- **Team Battle:** بطل 2025 (نهضة بركان) ضد بطل 2026 (المغرب الفاسي)، 12 مواجهة (11 لاعباً + المدربان).
  كاميرا + ميكروفون كخلفية (مثل فلتر)، والرسومات (النتيجة واللاعبان وWINNER) فوق الصورة،
  والمستخدم يضغط على اللاعب الأفضل ويعلّق بصوته.
  النهاية: الفريق الفائز، النتيجة، واللاعبون الذين اختارهم للفريق الفائز.
  البيانات في `src/data/teams.ts` و`src/data/battles.ts`.

- **Career Legend:** مسيرة لاعب مغربي من 17 إلى 38. تختار الاسم والمركز، ثم ناديك الأول من أول 10 أندية مغربية،
  ثم أسلوب المسيرة (تطوير/لياقة/دور أكبر)، ثم قرارات الانتقال والتجديد. بين القرارات تُحاكى المواسم تلقائياً
  وتظهر كفصل متحرك. الصوت = ميكروفون + مؤثرات مولّدة تُسجَّل معاً. المحرك في `src/career/`، والرسم في
  `src/utils/careerRenderer.ts`، وشعارات الأندية الاختيارية في `public/clubs/`.

## كيف يعمل
Camera → `<video>` مخفي → Canvas 1080×1920 (السؤال، الترتيب، الأنيميشن، النتيجة)
→ `captureStream(30)` + صوت الميكروفون → MediaRecorder → Preview.
واجهة React (البطاقات، الأزرار) للتفاعل فقط ولا تظهر في الفيديو.

## صور اللاعبين
ضع الصور في `public/players/` بالأسماء المذكورة في `public/players/README.md`.
الصورة الناقصة تظهر بالأحرف الأولى ولا يتعطل التطبيق.
