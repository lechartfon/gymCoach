# gymCoach

Aplicación móvil para seguir tus rutinas de gimnasio, registrar los pesos de cada serie y anotar notas, con historial de progreso. Funciona **sin conexión** y guarda todos los datos **únicamente en el dispositivo**.

## Funcionalidades

- **Rutinas ordenadas (A, B, C, D…)**: crea rutinas, añade ejercicios, reordénalos y configura series, repeticiones, descanso e instrucciones.
- **Sugerencia inteligente**: la app propone la siguiente rutina según el orden configurado y la última que completaste, con vuelta al principio (A → B → C → D → A). Siempre puedes elegir otra.
- **Entrenamiento guiado**: ves el ejercicio actual con su explicación, marcas cada serie como completada, anotas el **peso en kg** y escribes notas libres por ejercicio. Pasas al siguiente con un botón.
- **Temporizador de descanso opcional**: cuenta atrás configurable por ejercicio. Se inicia automáticamente al completar una serie (o manualmente), se puede pausar u omitir y **sigue siendo correcta si la app pasa a segundo plano** (sin notificaciones).
- **Historial y progreso**: consulta todos los entrenamientos completados y la evolución de pesos y notas por ejercicio.
- **Copia de seguridad y exportación**: exporta un JSON completo reimportable y un CSV del historial para abrirlo en una hoja de cálculo.
- **Datos de ejemplo**: carga las rutinas A, B, C y D de muestra con un toque.

## Stack

- **Expo SDK 57 + React Native + TypeScript**
- **Expo Router** para la navegación (rutas en `src/app/`)
- **expo-sqlite** como base de datos local en el dispositivo
- **Jest + jest-expo + React Native Testing Library** para pruebas
- **EAS Build** para compilaciones en la nube (Android/iOS) y **GitHub Actions** para CI

## Estructura del proyecto

```
src/
  app/                 # Rutas (Expo Router)
    (tabs)/            # Inicio, Rutinas, Historial, Ajustes
    routine/[id]/      # Detalle y edición de rutina, añadir ejercicio
    exercise/          # Biblioteca y edición de ejercicios
    progress/          # Progreso por ejercicio
    workout/[id].tsx   # Entrenamiento activo (con temporizador)
    session/[id].tsx   # Resumen de un entrenamiento
  components/          # Componentes reutilizables (UI y temporizador)
  db/                  # Tipos, migraciones y repositorio SQLite
  logic/               # Sugerencia de rutinas, formato, CSV, descanso
```

## Puesta en marcha

Requisitos: **Node.js 22+** y la app **Expo Go** en tu teléfono Android (para probar sin compilar) o un emulador.

```bash
npm install
npx expo start
```

Escanea el código QR con Expo Go (Android) o pulsa `a` para abrir el emulador. En Windows, si el teléfono y el ordenador están en redes distintas, usa `npx expo start --tunnel`.

> Nota: esta app usa solo módulos incluidos en Expo Go, así que puede probarse sin compilar.

## Comandos útiles

```bash
npm start            # servidor de desarrollo (expo start)
npm run android      # abrir en emulador/dispositivo Android
npm test             # tests con Jest
npm run typecheck    # comprobar tipos (tsc --noEmit)
npm run lint         # lint (eslint-config-expo)
npx expo-doctor      # diagnosticar configuración y dependencias
```

## Compilación de prueba para Android (EAS)

El repositorio incluye `eas.json` con un perfil `preview` que genera un **APK instalable** (sin publicar en tiendas).

Pasos (una sola vez):

```bash
npm install -g eas-cli
eas login              # inicia sesión con tu cuenta de Expo (gratuita)
eas init               # vincula el proyecto con tu cuenta y añade el projectId
```

Compilar el APK:

```bash
eas build --platform android --profile preview
```

Al terminar, EAS muestra un enlace de descarga; instálalo en tu teléfono Android y listo. Alternativa local sin cuenta de Expo: `npx expo run:android` (requiere Android Studio y SDK de Android instalados).

## Integración continua

`.github/workflows/ci.yml` ejecuta en cada push a `main` y en cada pull request:

1. `npm run typecheck`
2. `npm test`
3. `npm run lint`

## Cómo se comporta el descanso en segundo plano

Al iniciar el descanso se guarda la **hora exacta de finalización** en la base de datos. Si la app pasa a segundo plano, Android puede suspender el código, pero al volver la cuenta atrás se recalcula con esa hora, así que sigue siendo exacta. No se muestran notificaciones (por decisión de diseño).

## Git

```bash
git add .
git commit -m "Descripción del cambio"
git push
```
