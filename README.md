# 💰 Control de Gastos Personal

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23F7DF1E.svg?style=for-the-badge&logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)

**Control de Gastos Personal** es una aplicación web progresiva (PWA) diseñada para ayudarte a tomar el control total de tus finanzas. Permite registrar ingresos y gastos, visualizar balances mensuales y sincronizar tus datos en la nube de forma segura.

---

## 🚀 Características Principales

- **🔐 Autenticación Segura**: Sistema de inicio de sesión y registro gestionado por Supabase.
- **☁️ Sincronización en la Nube**: Tus datos siempre a salvo y sincronizados entre dispositivos.
- **📊 Resumen Analítico**: Visualización de los 5 gastos más altos y desglose por categorías.
- **📅 Navegación Mensual**: Revisa tus registros históricos mes a mes fácilmente.
- **📥 Exportación a Excel**: Descarga tus datos en formato `.xlsx` con un solo clic.
- **📱 Experiencia PWA**: Instalable en dispositivos móviles y funcional sin conexión (Offline support).
- **🎨 Diseño Premium**: Interfaz moderna con modo oscuro, tipografía optimizada y micro-interacciones.

---

## 📂 Estructura del Proyecto

```text
Gastos/
├── icons/             # Biblioteca de íconos SVG
├── fonts/             # Tipografías personalizadas (Oswald, Space Grotesk)
├── index.html         # Estructura principal de la app
├── styles.css         # Estilos y diseño responsivo
├── script.js          # Lógica principal y cálculos
├── auth.js            # Gestión de autenticación
├── supabase.js        # Configuración del cliente Supabase
├── service-worker.js  # Lógica para soporte PWA y offline
├── manifest.json      # Configuración de instalación de la app
├── robots.txt         # Configuración para rastreadores
└── sitemap.xml       # Mapa del sitio para SEO
```

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Backend/Base de Datos**: [Supabase](https://supabase.com/).
- **Hosting**: [Firebase Hosting](https://firebase.google.com/).
- **Librerías Externas**: 
  - [SheetJS (XLSX)](https://sheetjs.com/) para exportación de datos.
  - [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction).

---

## 💻 Instalación y Uso Local

Al ser una aplicación basada en tecnologías web estándar y CDNs, no requiere una fase de instalación compleja:

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/FotherMucker-7/control_gastos.git
   ```

2. **Configuración de Supabase**:
   Asegúrate de configurar tus credenciales en el archivo `supabase.js`:
   ```javascript
   const SUPABASE_URL = "TU_URL_DE_PROYECTO";
   const SUPABASE_ANON_KEY = "TU_ANON_KEY";
   ```

3. **Ejecutar**:
   Simplemente abre `index.html` en tu navegador o utiliza una extensión como "Live Server" en VS Code para una mejor experiencia de desarrollo.

---

## 🚀 Despliegue

El proyecto está configurado para desplegarse en **Firebase Hosting**. Para actualizar la versión en producción:

```bash
# Iniciar sesión en Firebase (si es la primera vez)
firebase login

# Desplegar cambios
firebase deploy
```

---

## 📄 Licencia

Este proyecto es de uso personal y educativo. Todos los derechos reservados.

---
Generado con ❤️ por [Antigravity](https://google.com) para **FotherMucker-7**.
