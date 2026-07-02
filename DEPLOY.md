# Path of Self — Guía de Despliegue (Fase 3)

## 1. Supabase Cloud

### Crear proyecto
1. Ve a [supabase.com](https://supabase.com) → New Project.
2. Copia **Project URL** y **anon public key**.

### Ejecutar schema
1. Dashboard → **SQL Editor** → New query.
2. Pega el contenido de `supabase/migrations/001_schema.sql` y ejecuta.

### Auth anónimo
1. **Authentication** → **Providers** → **Anonymous sign-ins** → Enable.

### Variables de entorno
Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Rellena:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Reinicia Expo (`npx expo start --clear`). En **Ajustes** verás **☁ Supabase Cloud**.

---

## 2. Vercel (Web)

### Opción A — CLI
```bash
npm i -g vercel
cd rpg-skill-tree
vercel
```

### Opción B — GitHub
1. Sube el repo a GitHub.
2. [vercel.com](https://vercel.com) → Import Project.
3. Root: `rpg-skill-tree`
4. Framework: **Other** (usa `vercel.json` incluido).

### Variables en Vercel
En Project Settings → Environment Variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Build command (auto desde `vercel.json`): `npm run build:web`  
Output: `dist`

---

## 3. Google Play Console

### Requisitos previos
- Cuenta Google Play Developer ($25 único).
- [Expo EAS](https://expo.dev/eas) cuenta gratuita.

### Configurar EAS
```bash
npm i -g eas-cli
eas login
eas init
```

Actualiza `app.json` → `extra.eas.projectId` con el ID generado.

### Build producción Android
```bash
eas build --platform android --profile production
```

Descarga el `.aab` desde expo.dev → Builds.

### Subir a Play Console
1. [play.google.com/console](https://play.google.com/console) → Create app.
2. **Release** → **Production** → Create release.
3. Sube el `.aab`.
4. Completa: ficha de tienda, iconos, política de privacidad, clasificación de contenido.

`package`: `com.pathofself.rpgskilltree` (en `app.json`).

---

## 4. Apple App Store

### Requisitos previos
- Apple Developer Program ($99/año).
- Mac no obligatorio para build (EAS compila en la nube).

### Build producción iOS
```bash
eas build --platform ios --profile production
```

### Submit
Edita `eas.json` → `submit.production.ios` con tu Apple ID y Team ID.

```bash
eas submit --platform ios --profile production
```

O sube manualmente el `.ipa` con **Transporter**.

`bundleIdentifier`: `com.pathofself.rpgskilltree`

---

## Modos de almacenamiento

| Entorno | Sin `.env` | Con Supabase `.env` |
|---------|------------|---------------------|
| Web local | localStorage | Supabase |
| Expo Go | SQLite | Supabase |
| Vercel prod | localStorage* | Supabase |

\* En Vercel siempre configura Supabase para persistencia real entre sesiones.

---

## Comandos útiles

```bash
npm start              # Dev local
npm run build:web      # Export estático web
npm run build:android  # EAS Android
npm run build:ios      # EAS iOS
```
