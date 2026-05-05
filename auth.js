let isLoginMode = true;
let isRecoveryMode = false;

document.addEventListener("DOMContentLoaded", () => {
  const authContainer = document.getElementById("auth-container");
  const appContainer = document.getElementById("app-container");
  const authForm = document.getElementById("auth-form");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const submitBtn = document.getElementById("auth-submit-btn");
  const toggleBtn = document.getElementById("auth-toggle-btn");
  const toggleText = document.getElementById("auth-toggle-text");
  const errorElement = document.getElementById("auth-error");
  const logoutBtn = document.getElementById("logout-btn");
  const userEmailDisplay = document.getElementById("user-email-display");
  const passwordConfirmGroup = document.getElementById("auth-password-confirm-group");
  const passwordConfirmInput = document.getElementById("auth-password-confirm");
  const forgotPasswordBtn = document.getElementById("auth-forgot-btn");
  const forgotPasswordLink = document.getElementById("forgot-password-link");
  const authTitle = document.querySelector(".auth-card h2");
  const authSubtitle = document.querySelector(".auth-card p");
  const emailGroup = emailInput.closest(".input-group");
  const authToggleGroup = document.querySelector(".auth-toggle");

  // Función para mostrar errores
  const showError = (message) => {
    if (message) {
      errorElement.textContent = message;
      errorElement.classList.remove("sr-only");
    } else {
      errorElement.classList.add("sr-only");
      errorElement.textContent = "";
    }
  };

  // Cambiar entre Login y Registro
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      isLoginMode = !isLoginMode;
      showError(""); // Limpiar errores
      if (isLoginMode) {
        submitBtn.textContent = "Iniciar Sesión";
        toggleText.textContent = "¿No tienes cuenta?";
        toggleBtn.textContent = "Regístrate";
        if (passwordConfirmGroup) {
          passwordConfirmGroup.style.display = "none";
          passwordConfirmInput.required = false;
        }
        if (forgotPasswordLink) forgotPasswordLink.style.display = "block";
      } else {
        submitBtn.textContent = "Registrarse";
        toggleText.textContent = "¿Ya tienes cuenta?";
        toggleBtn.textContent = "Inicia Sesión";
        if (passwordConfirmGroup) {
          passwordConfirmGroup.style.display = "block";
          passwordConfirmInput.required = true;
        }
        if (forgotPasswordLink) forgotPasswordLink.style.display = "none";
      }
    });
  }

  // Manejar el olvido de contraseña
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", async () => {
      const email = emailInput.value;
      if (!email) {
        showError("Por favor, ingresa tu correo primero.");
        return;
      }

      forgotPasswordBtn.disabled = true;
      forgotPasswordBtn.textContent = "Enviando...";
      showError("");

      try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        showError("¡Correo de recuperación enviado! Revisa tu bandeja de entrada.");
      } catch (error) {
        showError(error.message);
      } finally {
        forgotPasswordBtn.disabled = false;
        forgotPasswordBtn.textContent = "¿Olvidaste tu contraseña?";
      }
    });
  }

  // Función para activar el modo recuperación (UI)
  const setRecoveryUI = () => {
    isRecoveryMode = true;
    authTitle.textContent = "Nueva Contraseña";
    authSubtitle.textContent = "Ingresa tu nueva contraseña para acceder.";
    if (emailGroup) emailGroup.style.display = "none";
    emailInput.required = false; // Evita error de validación en campo oculto
    if (forgotPasswordLink) forgotPasswordLink.style.display = "none";
    if (authToggleGroup) authToggleGroup.style.display = "none";
    if (passwordConfirmGroup) passwordConfirmGroup.style.display = "block";
    passwordInput.placeholder = "Nueva Contraseña";
    passwordConfirmInput.placeholder = "Confirmar Nueva Contraseña";
    passwordConfirmInput.required = true;
    submitBtn.textContent = "Actualizar Contraseña";
    
    authContainer.style.display = "flex";
    appContainer.style.display = "none";
  };

  // Manejar el submit del formulario
  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = "Cargando...";
      showError("");

      const email = emailInput.value;
      const password = passwordInput.value;
      const passwordConfirm = passwordConfirmInput ? passwordConfirmInput.value : "";

      // Validar coincidencia de contraseñas (solo en registro y recuperación)
      if (!isLoginMode && !isRecoveryMode && password !== passwordConfirm) {
        showError("Las contraseñas no coinciden.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Registrarse";
        return;
      }
      if (isRecoveryMode && password !== passwordConfirm) {
        showError("Las contraseñas no coinciden.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Actualizar Contraseña";
        return;
      }

      try {
        // isRecoveryMode va primero para evitar que isLoginMode lo pise
        if (isRecoveryMode) {
          const { error } = await supabaseClient.auth.updateUser({ password });
          if (error) throw error;
          showError("¡Contraseña actualizada! Ya puedes usar la app.");
          setTimeout(() => window.location.reload(), 2000);
        } else if (isLoginMode) {
          const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } else {
          const { error } = await supabaseClient.auth.signUp({ email, password });
          if (error) throw error;
          
          // Verificar si Supabase requiere confirmación de email (comportamiento por defecto)
          showError("Revisa tu correo para confirmar tu cuenta, o inicia sesión si ya confirmaste.");
        }
      } catch (error) {
        // Traducir algunos errores comunes
        let msg = error.message;
        if (msg.includes("Invalid login credentials")) msg = "Credenciales incorrectas.";
        if (msg.includes("User already registered")) msg = "El usuario ya está registrado.";
        showError(msg);
      } finally {
        submitBtn.disabled = false;
        if (isRecoveryMode) {
          submitBtn.textContent = "Actualizar Contraseña";
        } else {
          submitBtn.textContent = isLoginMode ? "Iniciar Sesión" : "Registrarse";
        }
      }
    });
  }

  // Manejar el Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        console.error("Error al cerrar sesión:", error.message);
      } else {
        // Forzar limpieza de datos locales al cerrar sesión por seguridad
        localStorage.removeItem("controlGastos");
        mesActual = obtenerMesActual(); 
        datos = {};
        actualizarInterfaz();
      }
    });
  }

  // Escuchar cambios de estado en la sesión de Supabase
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      setRecoveryUI();
      return;
    }

    if (session) {
      // Si estamos en recuperación, no ocultamos el form aún
      if (isRecoveryMode) return;

      // Usuario autenticado
      authContainer.style.display = "none";
      appContainer.style.display = "flex";
      
      // Mostrar info del usuario en la cabecera
      userEmailDisplay.textContent = session.user.email;
      userEmailDisplay.classList.remove("sr-only");

      // Cargar datos locales de inmediato para la UI rápida
      cargarDatos();
      // Y luego cargar y combinar con la nube
      cargarDatosDesdeNube();
      
    } else {
      // Usuario no autenticado
      authContainer.style.display = "flex";
      appContainer.style.display = "none";
      userEmailDisplay.classList.add("sr-only");
    }
  });
});
