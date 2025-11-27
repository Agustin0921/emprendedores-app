// API base - ACTUALIZA CON TU URL DE RENDER
const API_URL = "https://emprendedores-app.onrender.com";

// AUTH helpers - CORREGIDO
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {})
  };

  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  try {
    const config = {
      method: opts.method || 'GET',
      headers: headers
    };

    if (opts.body) {
      config.body = JSON.stringify(opts.body);
    }

    const response = await fetch(API_URL + path, config);
    
    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      throw new Error("No autorizado - Sesión expirada");
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("API Fetch Error:", error);
    throw error;
  }
}

// LOGIN HANDLER
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Iniciando sesión...";
    submitBtn.disabled = true;

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: { email: email, password: password },
      });

      if (res.token) {
        localStorage.setItem("token", res.token);
        window.location.href = "dashboard.html";
      } else {
        alert(res.error || "Error en login");
      }
    } catch (error) {
      alert("Error de conexión: " + error.message);
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// REGISTER HANDLER  
if (document.getElementById("registerForm")) {
  document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const username = document.getElementById("regUsername").value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Creando cuenta...";
    submitBtn.disabled = true;

    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: { email: email, password: password, username: username },
      });

      if (res.success) {
        alert("Usuario creado. Iniciá sesión.");
        window.location.href = "login.html";
      } else {
        alert(res.error || "Error en registro");
      }
    } catch (error) {
      alert("Error de conexión: " + error.message);
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

// DASHBOARD - VERSIÓN COMPLETA ACTUALIZADA
if (document.getElementById("entryForm")) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("No estás autenticado");
    window.location.href = "login.html";
  }

  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    if (document.getElementById("userTitle")) {
      document.getElementById("userTitle").textContent = "Hola, " + decoded.username + "!";
    }
  } catch (error) {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  }

  document.getElementById("logoutBtn").addEventListener("click", function() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  });

  // Configurar categorías
  const incomeCategories = [
    { value: 'ventas', label: 'Ventas' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'inversiones', label: 'Inversiones' },
    { value: 'prestamos', label: 'Préstamos' },
    { value: 'otros', label: 'Otros ingresos' }
  ];

  const expenseCategories = [
    { value: 'insumos', label: 'Insumos' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'impuestos', label: 'Impuestos' },
    { value: 'sueldos', label: 'Sueldos' },
    { value: 'alquiler', label: 'Alquiler' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'otros', label: 'Otros gastos' }
  ];

  // Actualizar categorías cuando cambie el tipo
  document.getElementById("entryType").addEventListener("change", function() {
    const categorySelect = document.getElementById("entryCategory");
    const categories = this.value === "INCOME" ? incomeCategories : expenseCategories;
    
    categorySelect.innerHTML = '<option value="">Seleccionar categoría...</option>';
    categories.forEach(cat => {
      categorySelect.innerHTML += `<option value="${cat.value}">${cat.label}</option>`;
    });
  });

  // Inicializar categorías
  document.getElementById("entryType").dispatchEvent(new Event('change'));

  async function loadData() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "login.html";
        return;
      }

      const [entries, items] = await Promise.all([
        apiFetch("/entries", {}).catch(err => {
          console.error("Error cargando entries:", err);
          return [];
        }),
        apiFetch("/inventory", {}).catch(err => {
          console.error("Error cargando inventory:", err);
          return [];
        })
      ]);

      // Calcular métricas
      calculateMetrics(entries);
      
      // Mostrar datos
      displayEntries(entries);
      displayInventory(items);
      updateBudgets(entries);

    } catch (error) {
      console.error("Error cargando datos:", error);
      if (error.message.includes("401") || error.message.includes("Token") || error.message.includes("autorizado")) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
      } else {
        alert("Error cargando datos: " + error.message);
      }
    }
  }

  function calculateMetrics(entries) {
    let income = 0;
    let expense = 0;
    const incomeEntries = entries.filter(e => e.type === 'INCOME');
    const expenseEntries = entries.filter(e => e.type === 'EXPENSE');

    incomeEntries.forEach(e => income += Number(e.amount));
    expenseEntries.forEach(e => expense += Number(e.amount));

    // Métricas
    const profitMargin = income > 0 ? ((income - expense) / income * 100).toFixed(1) : 0;
    const averageTicket = incomeEntries.length > 0 ? (income / incomeEntries.length).toFixed(2) : 0;
    const monthlyROI = expense > 0 ? ((income - expense) / expense * 100).toFixed(1) : 0;

    // Actualizar UI
    document.getElementById('totalIncome').textContent = income.toFixed(2);
    document.getElementById('totalExpenses').textContent = expense.toFixed(2);
    document.getElementById('balance').textContent = (income - expense).toFixed(2);
    document.getElementById('profitMargin').textContent = profitMargin + '%';
    document.getElementById('averageTicket').textContent = '$' + averageTicket;
    document.getElementById('monthlyROI').textContent = monthlyROI + '%';
  }

  function displayEntries(entries) {
    const incomeList = document.getElementById("incomeList");
    const expenseList = document.getElementById("expenseList");
    incomeList.innerHTML = "";
    expenseList.innerHTML = "";

    const incomeEntries = entries.filter(e => e.type === 'INCOME');
    const expenseEntries = entries.filter(e => e.type === 'EXPENSE');

    // Mostrar estados vacíos si no hay datos
    if (incomeEntries.length === 0) {
      incomeList.innerHTML = '<div class="empty-state"><div>📊</div><p>No hay ingresos registrados</p></div>';
    }
    if (expenseEntries.length === 0) {
      expenseList.innerHTML = '<div class="empty-state"><div>💸</div><p>No hay egresos registrados</p></div>';
    }

    // Mostrar ingresos
    incomeEntries.forEach(function(e) {
      const div = document.createElement("div");
      div.className = "entry income-entry";
      div.innerHTML = `
        <div>
          <strong>${e.note || "Sin descripción"}</strong>
          <br>
          <small>${e.category ? `📁 ${e.category} • ` : ''}${new Date(e.created_at).toLocaleDateString()}</small>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="entry-amount income-amount">
            +$${Number(e.amount).toFixed(2)}
          </div>
          <button class="deleteEntryBtn" data-id="${e.id}" data-type="${e.type}">🗑</button>
        </div>
      `;
      incomeList.appendChild(div);
    });

    // Mostrar egresos
    expenseEntries.forEach(function(e) {
      const div = document.createElement("div");
      div.className = "entry expense-entry";
      div.innerHTML = `
        <div>
          <strong>${e.note || "Sin descripción"}</strong>
          <br>
          <small>${e.category ? `📁 ${e.category} • ` : ''}${new Date(e.created_at).toLocaleDateString()}</small>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="entry-amount expense-amount">
            -$${Number(e.amount).toFixed(2)}
          </div>
          <button class="deleteEntryBtn" data-id="${e.id}" data-type="${e.type}">🗑</button>
        </div>
      `;
      expenseList.appendChild(div);
    });

    // Event listeners para eliminar
    document.querySelectorAll(".deleteEntryBtn").forEach(function(btn) {
      btn.addEventListener("click", async function() {
        const id = btn.getAttribute("data-id");
        const type = btn.getAttribute("data-type");
        const typeText = type === "INCOME" ? "ingreso" : "egreso";
        
        if (!confirm(`¿Eliminar este ${typeText}?`)) return;

        try {
          const res = await apiFetch("/entries/" + id, { method: "DELETE" });
          if (res.success) loadData();
          else alert("Error al eliminar entrada");
        } catch (error) {
          alert("Error de conexión al eliminar entrada");
        }
      });
    });
  }

  function displayInventory(items) {
    const invList = document.getElementById("inventoryList");
    invList.innerHTML = "";

    if (items.length === 0) {
      invList.innerHTML = '<div class="empty-state"><div>📦</div><p>No hay productos en inventario</p></div>';
      return;
    }

    items.forEach(function(it) {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div>
          <strong>${it.name}</strong>
          <br>
          <small>Cantidad: ${it.qty} • Precio unitario: $${Number(it.price).toFixed(2)}</small>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="font-weight: 600; color: var(--yellow);">
            $${(Number(it.qty) * Number(it.price)).toFixed(2)}
          </div>
          <button class="deleteBtn" data-id="${it.id}">🗑</button>
        </div>
      `;
      invList.appendChild(div);
    });

    document.querySelectorAll(".deleteBtn").forEach(function(btn) {
      btn.addEventListener("click", async function() {
        const id = btn.getAttribute("data-id");
        if (!confirm("¿Eliminar este producto?")) return;

        try {
          const res = await apiFetch("/inventory/" + id, { method: "DELETE" });
          if (res.success) loadData();
          else alert("Error al eliminar producto");
        } catch (error) {
          alert("Error de conexión al eliminar producto");
        }
      });
    });
  }

  function updateBudgets(entries) {
    // Ejemplo básico de presupuestos
    const marketingExpenses = entries
      .filter(e => e.type === 'EXPENSE' && e.category === 'marketing')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const marketingBudget = 500; // Presupuesto ejemplo
    const progress = Math.min((marketingExpenses / marketingBudget) * 100, 100);

    document.querySelector('.budget-progress').style.width = progress + '%';
    document.querySelector('.budget-header span:last-child').textContent = 
      `$${marketingExpenses.toFixed(2)} / $${marketingBudget}`;
  }

  document.getElementById("entryForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const type = document.getElementById("entryType").value;
    const category = document.getElementById("entryCategory").value;
    const amount = document.getElementById("entryAmount").value;
    const note = document.getElementById("entryNote").value;

    if (!category) {
      alert("Por favor selecciona una categoría");
      return;
    }

    try {
      const res = await apiFetch("/entries", {
        method: "POST",
        body: { type: type, amount: amount, note: note, category: category },
      });

      if (res.success) {
        loadData();
        document.getElementById("entryForm").reset();
        document.getElementById("entryType").dispatchEvent(new Event('change'));
      } else {
        alert(res.error || "Error al guardar");
      }
    } catch (error) {
      alert("Error de conexión al guardar entrada: " + error.message);
    }
  });

  document.getElementById("itemForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const name = document.getElementById("itemName").value;
    const qty = document.getElementById("itemQty").value;
    const price = document.getElementById("itemPrice").value;

    try {
      const res = await apiFetch("/inventory", {
        method: "POST",
        body: { name: name, qty: qty, price: price },
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

  document.getElementById("calcBtn").addEventListener("click", function() {
    const expr = document.getElementById("calcExpr").value;
    try {
      const r = eval(expr);
      document.getElementById("calcResult").textContent = r;
    } catch {
      alert("Expresión inválida");
    }
  });

  document.getElementById("saveCalc").addEventListener("click", async function() {
    const val = document.getElementById("calcResult").textContent;
    if (!val || val === "-") {
      alert("Calculá un resultado primero");
      return;
    }

    try {
      const res = await apiFetch("/entries", {
        method: "POST",
        body: {
          type: "INCOME",
          amount: Number(val),
          note: "Calculadora",
          category: "otros"
        },
      });

      if (res.success) loadData();
      else alert(res.error || "Error al guardar");
    } catch (error) {
      alert("Error de conexión al guardar cálculo: " + error.message);
    }
  });

  loadData();
}

// ====================
  // NUEVAS FUNCIONALIDADES
  // ====================

  // NAVEGACIÓN DEL SIDEBAR
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function() {
      const section = this.getAttribute('data-section');
      
      // Remover activo de todos
      document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      
      // Activar actual
      this.classList.add('active');
      document.getElementById(section + 'Section').classList.add('active');
    });
  });

  // CARRUSEL DE RECORDATORIOS
  let currentSlide = 0;
  const carouselTrack = document.getElementById('carouselTrack');
  const defaultReminders = [
    "📅 Revisa tu inventario regularmente",
    "💰 Actualiza tus precios según costos",
    "📊 Analiza tus métricas mensuales",
    "🎯 Establece metas realistas"
  ];

  function initializeCarousel() {
    defaultReminders.forEach(reminder => {
      const item = document.createElement('div');
      item.className = 'carousel-item';
      item.textContent = reminder;
      carouselTrack.appendChild(item);
    });
  }

  function showSlide(index) {
    const slides = document.querySelectorAll('.carousel-item');
    if (slides.length === 0) return;
    
    currentSlide = (index + slides.length) % slides.length;
    carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
  }

  document.getElementById('carouselPrev').addEventListener('click', () => {
    showSlide(currentSlide - 1);
  });

  document.getElementById('carouselNext').addEventListener('click', () => {
    showSlide(currentSlide + 1);
  });

  // AUTO AVANCE DEL CARRUSEL
  setInterval(() => {
    showSlide(currentSlide + 1);
  }, 5000);

  // CALCULADORA DE PRECIOS
  document.getElementById('priceCalculatorForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const materialCost = parseFloat(document.getElementById('materialCost').value) || 0;
    const toolsCost = parseFloat(document.getElementById('toolsCost').value) || 0;
    const hoursWorked = parseFloat(document.getElementById('hoursWorked').value) || 0;
    const hourlyRate = parseFloat(document.getElementById('hourlyRate').value) || 0;
    const additionalCosts = parseFloat(document.getElementById('additionalCosts').value) || 0;
    const profitMargin = parseFloat(document.getElementById('profitMarginInput').value) || 0;
    
    // Cálculos
    const laborCost = hoursWorked * hourlyRate;
    const totalCost = materialCost + toolsCost + laborCost + additionalCosts;
    const salePrice = totalCost * (1 + profitMargin / 100);
    const profitAmount = salePrice - totalCost;
    const finalMargin = (profitAmount / salePrice * 100).toFixed(1);
    
    // Mostrar resultados
    document.getElementById('totalCost').textContent = '$' + totalCost.toFixed(2);
    document.getElementById('salePrice').textContent = '$' + salePrice.toFixed(2);
    document.getElementById('profitAmount').textContent = '$' + profitAmount.toFixed(2);
    document.getElementById('finalMargin').textContent = finalMargin + '%';
    
    document.getElementById('priceResult').style.display = 'block';
  });

  // GUARDAR COMO INGRESO - CORREGIDO (faltaba async)
  document.getElementById('saveAsIncome').addEventListener('click', async function() {
    const salePrice = document.getElementById('salePrice').textContent.replace('$', '');
    
    try {
      const res = await apiFetch("/entries", {
        method: "POST",
        body: {
          type: "INCOME",
          amount: parseFloat(salePrice),
          note: "Venta de producto artesanal",
          category: "ventas"
        },
      });

      if (res.success) {
        alert("¡Precio guardado como ingreso!");
        loadData();
      } else {
        alert("Error al guardar");
      }
    } catch (error) {
      alert("Error de conexión: " + error.message);
    }
  });

  // SISTEMA DE RECORDATORIOS PERSONALES
  let userReminders = JSON.parse(localStorage.getItem('userReminders')) || [];

  function displayUserReminders() {
    const list = document.getElementById('userRemindersList');
    list.innerHTML = '';
    
    if (userReminders.length === 0) {
      list.innerHTML = '<div class="empty-state"><div>🔔</div><p>No tienes recordatorios</p></div>';
      return;
    }
    
    userReminders.forEach((reminder, index) => {
      const item = document.createElement('div');
      item.className = `reminder-item ${reminder.priority}`;
      item.innerHTML = `
        <div class="reminder-content">
          <strong>${reminder.text}</strong>
          <div class="reminder-priority">${reminder.priority}</div>
        </div>
        <button class="deleteBtn" data-index="${index}">🗑</button>
      `;
      list.appendChild(item);
    });
    
    // Event listeners para eliminar
    document.querySelectorAll('#userRemindersList .deleteBtn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        userReminders.splice(index, 1);
        localStorage.setItem('userReminders', JSON.stringify(userReminders));
        displayUserReminders();
      });
    });
  }

  document.getElementById('reminderForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const text = document.getElementById('reminderText').value;
    const priority = document.getElementById('reminderPriority').value;
    
    userReminders.push({
      text: text,
      priority: priority,
      createdAt: new Date().toISOString()
    });
    
    localStorage.setItem('userReminders', JSON.stringify(userReminders));
    displayUserReminders();
    this.reset();
  });

  // INFORMACIÓN DE CUENTA
  function loadAccountInfo() {
    try {
      const decoded = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
      document.getElementById('accountUsername').textContent = decoded.username;
      document.getElementById('accountEmail').textContent = decoded.email;
      document.getElementById('accountSince').textContent = new Date(decoded.iat * 1000).toLocaleDateString();
    } catch (error) {
      console.error('Error cargando info de cuenta:', error);
    }
  }

  // INICIALIZAR TODO
  initializeCarousel();
  showSlide(0);
  displayUserReminders();
  loadAccountInfo();


console.log("app.js cargado");