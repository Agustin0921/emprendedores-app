// API base
const API_URL = "https://emprendedores-app-production.up.railway.app";

// AUTH helpers - MEJORADO CON MANEJO DE ERRORES
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {})
  };

  if (token) headers["Authorization"] = "Bearer " + token;

  try {
    console.log(`📡 Haciendo petición a: ${API_URL + path}`);
    const res = await fetch(API_URL + path, {
      ...opts,
      headers
    });

    console.log(`📡 Respuesta recibida: ${res.status}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Error HTTP: ${res.status}`, errorText);
      throw new Error(`Error ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error en apiFetch:", error);
    throw error;
  }
}

// --- LOGIN HANDLER ---
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("🔄 Iniciando proceso de login...");

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Mostrar loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Iniciando sesión...";
    submitBtn.disabled = true;

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      console.log("✅ Respuesta del login:", res);

      if (res.token) {
        localStorage.setItem("token", res.token);
        console.log("✅ Token guardado, redirigiendo a dashboard...");
        window.location.href = "dashboard.html";
      } else {
        alert(res.error || "Error en login - no se recibió token");
      }
    } catch (error) {
      console.error("❌ Error completo en login:", error);
      alert("Error de conexión: " + error.message);
    } finally {
      // Restaurar botón
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// --- REGISTER HANDLER ---
if (document.getElementById("registerForm")) {
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("🔄 Iniciando proceso de registro...");

    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const username = document.getElementById("regUsername").value;

    // Mostrar loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Creando cuenta...";
    submitBtn.disabled = true;

    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, username }),
      });

      console.log("✅ Respuesta del registro:", res);

      if (res.success) {
        alert("✅ Usuario creado exitosamente. Ahora podés iniciar sesión.");
        window.location.href = "login.html";
      } else {
        alert(res.error || "Error en el registro");
      }
    } catch (error) {
      console.error("❌ Error completo en registro:", error);
      alert("Error de conexión: " + error.message);
    } finally {
      // Restaurar botón
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// --- DASHBOARD ---
if (document.getElementById("entryForm")) {
  console.log("🔄 Inicializando dashboard...");

  // Verificar si hay token
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("❌ No hay token, redirigiendo a login...");
    alert("❌ No estás autenticado. Por favor, iniciá sesión.");
    window.location.href = "login.html";
    return;
  }

  // Mostrar nombre del usuario
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    console.log("👤 Usuario decodificado:", decoded);
    
    if (document.getElementById("userTitle")) {
      document.getElementById("userTitle").innerText = "Hola, " + (decoded.username || "Usuario") + "!";
    }
  } catch (error) {
    console.error("❌ Error decodificando token:", error);
    localStorage.removeItem("token");
    window.location.href = "login.html";
    return;
  }

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    console.log("🚪 Cerrando sesión...");
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });

  // Load dashboard data
  async function loadData() {
    try {
      console.log("🔄 Cargando datos del dashboard...");
      
      const entries = await apiFetch("/entries");
      const items = await apiFetch("/inventory");

      console.log("📊 Entradas cargadas:", entries);
      console.log("📦 Inventario cargado:", items);

      // Entries list
      const entriesList = document.getElementById("entriesList");
      if (entriesList) {
        entriesList.innerHTML = "";
        let income = 0;
        let expense = 0;

        (entries || []).forEach((e) => {
          const div = document.createElement("div");
          div.className = "entry";
          div.innerHTML = `<div>${e.type} • ${e.note || ""}</div><div>${Number(e.amount).toFixed(2)}</div>`;
          entriesList.appendChild(div);

          if (e.type === "INCOME") income += Number(e.amount);
          else expense += Number(e.amount);
        });

        document.getElementById("totalIncome").innerText = income.toFixed(2);
        document.getElementById("totalExpenses").innerText = expense.toFixed(2);
        document.getElementById("balance").innerText = (income - expense).toFixed(2);
      }

      // Inventory list
      const invList = document.getElementById("inventoryList");
      if (invList) {
        invList.innerHTML = "";

        (items || []).forEach((it) => {
          const div = document.createElement("div");
          div.className = "item";

          div.innerHTML = `
            <div>${it.name} x${it.qty}</div>
            <div>
              $${Number(it.price).toFixed(2)}
              <button class="deleteBtn" data-id="${it.id}">🗑</button>
            </div>
          `;

          invList.appendChild(div);
        });

        // Eventos de eliminar item
        document.querySelectorAll(".deleteBtn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const id = btn.getAttribute("data-id");
            if (!confirm("¿Eliminar este producto?")) return;

            try {
              const res = await apiFetch(`/inventory/${id}`, { method: "DELETE" });
              if (res.success) {
                loadData();
              } else {
                alert("Error al eliminar producto");
              }
            } catch (error) {
              alert("Error de conexión al eliminar producto");
            }
          });
        });
      }

    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      if (error.message.includes("401") || error.message.includes("403")) {
        alert("Sesión expirada. Por favor, iniciá sesión nuevamente.");
        localStorage.removeItem("token");
        window.location.href = "login.html";
      } else {
        alert("Error cargando datos: " + error.message);
      }
    }
  }

  // Add entry
  document.getElementById("entryForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("entryType").value;
    const amount = document.getElementById("entryAmount").value;
    const note = document.getElementById("entryNote").value;

    try {
      const res = await apiFetch("/entries", {
        method: "POST",
        body: JSON.stringify({ type, amount, note }),
      });

      if (res.success) {
        loadData();
        document.getElementById("entryForm").reset();
      } else {
        alert(res.error || "Error al guardar");
      }
    } catch (error) {
      alert("Error de conexión al guardar entrada: " + error.message);
    }
  });

  // Add item
  document.getElementById("itemForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("itemName").value;
    const qty = document.getElementById("itemQty").value;
    const price = document.getElementById("itemPrice").value;

    try {
      const res = await apiFetch("/inventory", {
        method: "POST",
        body: JSON.stringify({ name, qty, price }),
      });

      if (res.success) {
        loadData();
        document.getElementById("itemForm").reset();
      } else {
        alert(res.error || "Error al guardar item");
      }
    } catch (error) {
      alert("Error de conexión al guardar item: " + error.message);
    }
  });

  // Calculator
  document.getElementById("calcBtn").addEventListener("click", () => {
    const expr = document.getElementById("calcExpr").value;
    if (/[^0-9+\-*/(). ]/.test(expr)) return alert("Expresión inválida");

    try {
      const r = eval(expr);
      document.getElementById("calcResult").innerText = r;
    } catch {
      alert("Expresión inválida");
    }
  });

  document.getElementById("saveCalc").addEventListener("click", async () => {
    const val = document.getElementById("calcResult").innerText;
    if (!val || val === "-") return alert("Calculá un resultado primero");

    try {
      const res = await apiFetch("/entries", {
        method: "POST",
        body: JSON.stringify({
          type: "INCOME",
          amount: Number(val),
          note: "Calculadora",
        }),
      });

      if (res.success) loadData();
      else alert(res.error || "Error al guardar");
    } catch (error) {
      alert("Error de conexión al guardar cálculo: " + error.message);
    }
  });

  // Cargar datos iniciales
  loadData();
}

// Proteger páginas que requieren autenticación
if (window.location.pathname.includes("dashboard.html")) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("❌ Debes iniciar sesión para acceder a esta página");
    window.location.href = "login.html";
  }
}

console.log("✅ app.js cargado correctamente");