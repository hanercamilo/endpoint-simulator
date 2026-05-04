---

<div align="center">

![Endpoint Simulator Logo](public/vite.svg)

**Simulador profesional de endpoints API con editor de respuestas JSON, configuración de códigos HTTP, sincronización en la nube con Supabase y servidor Express local. Construido con React, Express y TypeScript para máxima productividad.**

[![GitHub](https://img.shields.io/badge/GitHub-hanercamilo-181717?style=for-the-badge&logo=github)](https://github.com/hanercamilo)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-hanercamilo-0077B5?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/hanercamilo)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-hanercamilo-FFDD00?style=for-the-badge&logo=buymeacoffee)](https://buymeacoffee.com/hanercamilo)

</div>

---

## Tabla de Contenidos
- [¿Qué es Endpoint Simulator?](#qué-es-endpoint-simulator)
- [Características Principales](#características-principales)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Cómo Empezar](#cómo-empezar)
- [Casos de Uso](#casos-de-uso)

---

## ¿Qué es Endpoint Simulator?
**Endpoint Simulator** es una aplicación web y servidor avanzada diseñada para desarrolladores que necesitan simular respuestas de APIs de forma rápida y persistente. Permite crear colecciones de endpoints, definir respuestas JSON personalizadas, cambiar códigos de estado HTTP al vuelo y consumir estas respuestas a través de un servidor Express local, todo sincronizado en la nube mediante Supabase.

---

## Características Principales
✨ **Editor JSON Integrado** - Crea y edita las respuestas de tus endpoints fácilmente  
🏷️ **Colecciones** - Organiza tus endpoints por proyecto o dominio  
🔄 **Sincronización Cloud** - Guarda tus endpoints en Supabase y accede desde cualquier lugar  
🚀 **Servidor Local (Node.js)** - Consume tus mocks reales en el puerto local a través de Express  
⚙️ **Códigos HTTP Dinámicos** - Cambia la respuesta de 200 a 404, 500, etc., con un solo clic  
👥 **Autenticación** - Protege y asocia tus colecciones mediante inicio de sesión  
📱 **Interfaz Moderna** - Diseño en modo oscuro, limpio y rápido con TailwindCSS  

---

## Tecnologías Utilizadas
<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)

</div>

---

## Cómo Empezar

1. **Clonar el repositorio e instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar Supabase:**
   Crea un archivo `.env` en la raíz (usa `.env.example` de base) y agrega tus credenciales:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
   API_PORT=3001
   ```
   *Nota:* No olvides ejecutar las migraciones SQL que se encuentran en `/supabase/migrations` en tu proyecto de Supabase y otorgar los permisos RLS correspondientes para que el backend pueda acceder a los datos.

3. **Iniciar los servidores:**
   ```bash
   npm run dev
   ```
   Esto iniciará concurrentemente la interfaz React (puerto `5173`) y el servidor de la API Express (puerto `3001`).

---

## Casos de Uso

### 👨‍💻 Desarrolladores Frontend
- Simula APIs de backend que aún no están listas.
- Evita bloqueos en el desarrollo de la UI.
- Testea el manejo de errores (404, 500) con solo un clic.

### 🐛 QA & Testing
- Crea escenarios de respuestas específicos para pruebas E2E.
- Evalúa cómo reacciona tu aplicación ante fallos de red simulados.

### 📱 Desarrolladores Móviles
- Dispón de una API siempre en línea para desarrollar apps móviles sin depender del equipo backend.

---

<div align="center">

**Desarrollado con ❤️ por [hanercamilo](https://github.com/hanercamilo)**

[![GitHub](https://img.shields.io/badge/GitHub-hanercamilo-181717?style=flat-square&logo=github)](https://github.com/hanercamilo) • [![LinkedIn](https://img.shields.io/badge/LinkedIn-hanercamilo-0077B5?style=flat-square&logo=linkedin)](https://linkedin.com/in/hanercamilo) • [![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-hanercamilo-FFDD00?style=flat-square&logo=buymeacoffee)](https://buymeacoffee.com/hanercamilo)

</div>
