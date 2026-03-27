# Tokless — Deploy en Vercel + GitHub

TikTok downloader sin marca de agua. Serverless functions en Vercel.

---

## Estructura del proyecto

```
tokless/
├── api/
│   ├── services/
│   │   └── tiktok.js      ← lógica compartida (fetch + normalise)
│   ├── video.js           ← GET /api/video?url=...
│   └── proxy.js           ← GET /api/proxy?url=...  (streaming CDN)
├── public/
│   └── index.html         ← frontend
├── vercel.json
├── package.json
└── .gitignore
```

---

## Paso a paso: subir a GitHub y deployar en Vercel

### 1. Instalar Git (si no tenés)
https://git-scm.com/downloads

### 2. Crear repositorio en GitHub
1. Ir a https://github.com/new
2. Nombre: `tokless`
3. Visibility: **Public** (o Private — ambos funcionan con Vercel gratis)
4. **NO** marcar "Add README" ni "Add .gitignore"
5. Click **Create repository**

### 3. Subir el código

Abrir terminal en la carpeta del proyecto:

```bash
git init
git add .
git commit -m "feat: initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/tokless.git
git push -u origin main
```

### 4. Conectar con Vercel

1. Ir a https://vercel.com → **Sign up** con tu cuenta de GitHub
2. Click **Add New → Project**
3. Buscar el repo `tokless` → click **Import**
4. Settings:
   - **Framework Preset**: Other
   - **Root Directory**: `./`  (dejar vacío)
   - **Build Command**: dejar vacío
   - **Output Directory**: `public`
5. Click **Deploy** 🚀

Vercel detecta automáticamente la carpeta `api/` y despliega cada archivo como una serverless function.

### 5. (Opcional) Variables de entorno en Vercel

En tu proyecto de Vercel → Settings → Environment Variables:

| Variable        | Valor         | Para qué sirve                              |
|-----------------|---------------|---------------------------------------------|
| `TIKWM_TOKEN`   | tu token      | Mayor límite de requests en tikwm.com       |
| `RAPIDAPI_KEY`  | tu API key    | Fallback si tikwm falla                     |

Podés obtener un token gratis registrándote en https://tikwm.com

---

## URLs de tu app una vez deployada

| URL                                   | Qué hace                         |
|---------------------------------------|----------------------------------|
| `https://tokless.vercel.app/`         | Frontend                         |
| `https://tokless.vercel.app/api/video?url=...` | API — info del video    |
| `https://tokless.vercel.app/api/proxy?url=...` | Stream CDN sin CORS     |

---

## Actualizar el sitio

Cualquier `git push` a `main` hace re-deploy automático en Vercel:

```bash
git add .
git commit -m "fix: algún cambio"
git push
```

---

## Límites del plan gratuito de Vercel

| Recurso              | Límite free       |
|----------------------|-------------------|
| Serverless functions | 100 GB-hours/mes  |
| Bandwidth            | 100 GB/mes        |
| Requests             | Ilimitadas        |
| Dominios custom      | ✅ Incluido        |

Más que suficiente para un proyecto personal o de tráfico moderado.
