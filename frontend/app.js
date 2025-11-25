// API base
const API_URL = "https://emprendedores-app-production.up.railway.app";

// AUTH helpers
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {})
  };

  if (token) headers["Authorization"] = "Bearer " + token;

  const res = await fetch(API_URL + path, {
    ...opts,
    headers
  });

  return res.json();
}

// --- LOGIN HANDLER ---
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (res.token) {
      localStorage.setItem("token", res.token);
      window.location = "dashboard.html";
    } else {
      alert(res.error || "Error en login");
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

    const res = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, username }),
    });

    if (res.success) {
      alert("Usuario creado. Iniciá sesión.");
      window.location = "login.html";
    } else {
      alert(res.error || "Error en registro");
    }
  });
}


// --- DASHBOARD ---
if (document.getElementById("entryForm")) {

  // Mostrar nombre del usuario
  const decoded = JSON.parse(atob(localStorage.getItem("token").split('.')[1]));
  if (document.getElementById("userTitle")) {
    document.getElementById("userTitle").innerText = "Hola, " + decoded.username + "!";
  }

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location = "login.html";
  });

  // Load dashboard data
  async function loadData() {
    const entries = await apiFetch("/entries");
    const items = await apiFetch("/inventory");

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

    // Inventory list (AGREGADO BOTÓN ELIMINAR)
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

        const res = await apiFetch(`/inventory/${id}`, { method: "DELETE" });
        if (res.success) loadData();
        else alert("Error al eliminar producto");
      });
    });
  }

  // Add entry
  document.getElementById("entryForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("entryType").value;
    const amount = document.getElementById("entryAmount").value;
    const note = document.getElementById("entryNote").value;

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
  });

  // Add item
  document.getElementById("itemForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("itemName").value;
    const qty = document.getElementById("itemQty").value;
    const price = document.getElementById("itemPrice").value;

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
  });

  loadData();
}
