# CLIPSO.AI — App (Frontend Dashboard)

Dashboard donde los usuarios suben vídeos y la IA los edita.

**Stack:** Next.js 14 · Tailwind · Supabase Auth · Axios · React Dropzone · Framer Motion

---

## 🚀 Desarrollo local

```bash
cd app
npm install
cp .env.example .env.local
# Edita .env.local
npm run dev
# → http://localhost:3001
```

---

## 📂 Estructura

```
app/
├── src/
│   ├── app/
│   │   ├── (auth)/login,signup
│   │   ├── (dashboard)/dashboard,projects,upload,jobs/[id]
│   │   ├── layout.tsx, page.tsx, globals.css
│   ├── components/Sidebar.tsx
│   ├── lib/
│   │   ├── supabase/{client,server,middleware}.ts
│   │   ├── api.ts          # Axios client → backend
│   │   └── utils.ts
│   └── middleware.ts        # Auth gate
├── Dockerfile
├── tailwind.config.ts
└── package.json
```

---

## 🔄 Flujo de usuario

1. **Signup/Login** (Supabase Auth)
2. **Dashboard** → ver proyectos y jobs
3. **Upload** → arrastra vídeos, configura preferencias
4. **Backend** crea presigned URL → vídeo va directo a R2
5. **Job** se encola en Redis → worker procesa con IA
6. **Polling** cada 3s → progreso 0-100%
7. **Descarga** o **feedback** para re-editar

---

## 🐳 Deploy en EasyPanel

- **Type:** Docker (from GitHub)
- **Repo:** `oneagencywebsia-cloud/clipso-ai-app`
- **Port:** 3001
- **Domain:** `app.clipso.ai`
- **Build args:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_URL`

---

© CLIPSO.AI 2026
