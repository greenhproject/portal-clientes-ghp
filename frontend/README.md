# Sistema de Soporte Post-Venta - Frontend MVP
## Green House Project

Frontend del sistema de soporte desarrollado con React + TypeScript + Vite.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar backend URL
cp .env.example .env
# Editar .env con la URL de tu backend

# Ejecutar en desarrollo
npm run dev
```

La aplicación estará en `http://localhost:5173`

## 🎯 Funcionalidades

- ✅ Login y registro de usuarios
- ✅ Dashboard con estadísticas
- ✅ Crear tickets de soporte
- ✅ Ver lista de tickets
- ✅ Diseño responsive con colores de GHP

## 📦 Build para Producción

```bash
npm run build
```

Los archivos estarán en `dist/`

## 🔧 Configuración

Editar `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

Para producción, cambiar a la URL de Railway.

## 📁 Estructura

```
src/
├── contexts/       # Auth context
├── pages/          # Login, Register, Dashboard, NewTicket
├── services/       # API service
└── styles/         # CSS files
```

## 🎨 Colores de GHP

- Verde Principal: `#4CAF50`
- Verde Oscuro: `#388E3C`
- Verde Claro: `#81C784`

---

**Versión:** 1.0.0 MVP  
**Desarrollado por:** Manus AI

