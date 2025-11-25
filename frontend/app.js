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
    const res = await fetch(API_URL + path, {
      ...opts,
      headers
    });

    // Log para debugging - QUITA ESTO EN PRODUCCIÓN
    console.log(`📡 API Call: ${path}`, { status: res.status });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || `HTTP error! status: ${res.status}`);
    }
    
    return data;
  } catch (error) {
    console.error("❌ API Fetch Error:", error);
    throw error;
  }
}

// --- LOGIN HANDLER ---
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

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

      if (res.token) {
        localStorage.setItem("token", res.token);
        console.log("✅ Login exitoso, redirigiendo...");
        window.location.href = "dashboard.html";
      } else {
        alert(res.error || "Error en login");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
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

      if (res.success) {
        alert("✅ Usuario creado. Iniciá sesión.");
        window.location.href = "login.html";
      } else {
        alert(res.error || "Error en registro");
      }
    } catch (error) {
      console.error("❌ Register error:", error);
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

  // Verificar si hay token
  if (!localStorage.getItem("token")) {
    alert("❌ No estás autenticado");
    window.location.href = "login.html";
    return;
  }

  // Mostrar nombre del usuario
  try {
    const decoded = JSON.parse(atob(localStorage.getItem("token").split('.')[1]));
    if (document.getElementById("userTitle")) {
      document.getElementById("userTitle").innerText = "Hola, " + decoded.username + "!";
    }
  } catch (error) {
    console.error("Error decodificando token:", error);
    localStorage.removeItem("token");
    window.location.href = "login.html";
    return;
  }

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });

  // Load dashboard data
  async function loadData() {
    try {
      console.log("🔄 Cargando datos del dashboard...");
      
      const [entries, items] = await Promise.all([
        apiFetch("/entries"),
        apiFetch("/inventory")
      ]);

      console.log("📊 Datos cargados:", { entries, items });

      // Entries list
      const entriesList = document.getElementById("entriesList");
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

      // Inventory list
      const invList = document.getElementById("inventoryList");
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
if (document.getElementById("dashboard") || document.getElementById("entryForm")) {
  if (!localStorage.getItem("token")) {
    alert("❌ Debes iniciar sesión para acceder a esta página");
    window.location.href = "login.html";
  }
}