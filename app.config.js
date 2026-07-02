/** Carga .env al arrancar Expo y expone las claves en extra (respaldo de process.env). */
require('dotenv/config');

const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    },
  },
};
