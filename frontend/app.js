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

  // FUNCIÓN NUEVA: Formatear fechas consistentemente
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Fecha no disponible';
    }
  };

  // FUNCIÓN NUEVA: Obtener texto del método de pago
  const getPaymentMethodText = (method) => {
    const methods = {
      'efectivo': 'Efectivo',
      'transferencia': 'Transferencia',
      'tarjeta': 'Tarjeta',
      'otro': 'Otro'
    };
    return methods[method] || method || 'No especificado';
  };

  // FUNCIÓN NUEVA: Obtener icono del método de pago
  const getPaymentMethodIcon = (method) => {
    const icons = {
      'efectivo': 'bx-money',
      'transferencia': 'bx-transfer',
      'tarjeta': 'bx-credit-card',
      'otro': 'bx-wallet'
    };
    return icons[method] || 'bx-wallet';
  };

  function displayEntries(entries) {
    const incomeList = document.getElementById("incomeList");
    const expenseList = document.getElementById("expenseList");
    incomeList.innerHTML = "";
    expenseList.innerHTML = "";

    const incomeEntries = entries.filter(e => e.type === 'INCOME');
    const expenseEntries = entries.filter(e => e.type === 'EXPENSE');

    // Mostrar estados vacíos si no hay datos
    if (incomeEntries.length === 0) {
      incomeList.innerHTML = '<div class="empty-state"><i class="bx bx-line-chart"></i><p>No hay ingresos registrados</p></div>';
    }
    if (expenseEntries.length === 0) {
      expenseList.innerHTML = '<div class="empty-state"><i class="bx bx-money"></i><p>No hay egresos registrados</p></div>';
    }

    // Mostrar ingresos CON MÉTODO DE PAGO
    incomeEntries.forEach(function(e) {
      const div = document.createElement("div");
      div.className = "entry income-entry";
      
      const paymentIcon = getPaymentMethodIcon(e.payment_method);
      const paymentText = getPaymentMethodText(e.payment_method);
      
      div.innerHTML = `
        <div>
          <strong>${e.note || "Sin descripción"}</strong>
          <br>
          <small>
            ${e.category ? `📁 ${e.category} • ` : ''}
            <i class='bx ${paymentIcon}' title="${paymentText}"></i> ${paymentText} • 
            ${formatDate(e.created_at)}
          </small>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="entry-amount income-amount">
            +$${Number(e.amount).toFixed(2)}
          </div>
          <button class="deleteEntryBtn" data-id="${e.id}" data-type="${e.type}">
            <i class='bx bx-trash'></i>
          </button>
        </div>
      `;
      incomeList.appendChild(div);
    });

    // Mostrar egresos CON MÉTODO DE PAGO
    expenseEntries.forEach(function(e) {
      const div = document.createElement("div");
      div.className = "entry expense-entry";
      
      const paymentIcon = getPaymentMethodIcon(e.payment_method);
      const paymentText = getPaymentMethodText(e.payment_method);
      
      div.innerHTML = `
        <div>
          <strong>${e.note || "Sin descripción"}</strong>
          <br>
          <small>
            ${e.category ? `📁 ${e.category} • ` : ''}
            <i class='bx ${paymentIcon}' title="${paymentText}"></i> ${paymentText} • 
            ${formatDate(e.created_at)}
          </small>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="entry-amount expense-amount">
            -$${Number(e.amount).toFixed(2)}
          </div>
          <button class="deleteEntryBtn" data-id="${e.id}" data-type="${e.type}">
            <i class='bx bx-trash'></i>
          </button>
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
      invList.innerHTML = '<div class="empty-state"><i class="bx bx-package"></i><p>No hay productos en inventario</p></div>';
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
          <br>
          <small>Agregado: ${formatDate(it.created_at)}</small>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="font-weight: 600; color: var(--yellow);">
            $${(Number(it.qty) * Number(it.price)).toFixed(2)}
          </div>
          <button class="deleteBtn" data-id="${it.id}">
            <i class='bx bx-trash'></i>
          </button>
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

  // ACTUALIZADO: Ahora incluye método de pago
  document.getElementById("entryForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const type = document.getElementById("entryType").value;
    const category = document.getElementById("entryCategory").value;
    const amount = document.getElementById("entryAmount").value;
    const note = document.getElementById("entryNote").value;
    const paymentMethod = document.getElementById("paymentMethod") ? document.getElementById("paymentMethod").value : "efectivo";

    if (!category) {
      alert("Por favor selecciona una categoría");
      return;
    }

    try {
      const res = await apiFetch("/entries", {
        method: "POST",
        body: { 
          type: type, 
          amount: amount, 
          note: note, 
          category: category,
          payment_method: paymentMethod
        },
      });

      if (res.success) {
        loadData();
        document.getElementById("entryForm").reset();
        document.getElementById("entryType").dispatchEvent(new Event('change'));
        // Restablecer método de pago a efectivo
        if (document.getElementById("paymentMethod")) {
          document.getElementById("paymentMethod").value = "efectivo";
        }
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
          category: "otros",
          payment_method: "efectivo"
        },
      });

      if (res.success) loadData();
      else alert(res.error || "Error al guardar");
    } catch (error) {
      alert("Error de conexión al guardar cálculo: " + error.message);
    }
  });

  loadData();

  // ====================
  // NUEVAS FUNCIONALIDADES (CON VERIFICACIONES)
  // ====================

  // NAVEGACIÓN DEL SIDEBAR - Solo si existe
  if (document.querySelector('.menu-item')) {
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', function() {
        const section = this.getAttribute('data-section');
        
        // Remover activo de todos
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        
        // Activar actual
        this.classList.add('active');
        const sectionElement = document.getElementById(section + 'Section');
        if (sectionElement) {
          sectionElement.classList.add('active');
        }
      });
    });
  }

  // CARRUSEL DE RECORDATORIOS MEJORADO - Solo si existe
  const carouselTrack = document.getElementById('carouselTrack');
  if (carouselTrack) {
    let currentSlide = 0;
    let userReminders = JSON.parse(localStorage.getItem('userReminders')) || [];

    function initializeCarousel() {
      carouselTrack.innerHTML = '';
      
      // Si no hay recordatorios del usuario, mostrar mensaje
      if (userReminders.length === 0) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'carousel-item';
        emptyItem.innerHTML = `
          <i class='bx bx-bell-off'></i>
          <span>No tienes recordatorios. Agrega algunos en la sección "Mis Recordatorios"</span>
        `;
        carouselTrack.appendChild(emptyItem);
        return;
      }
      
      // Mostrar recordatorios del usuario
      userReminders.forEach(reminder => {
        const item = document.createElement('div');
        item.className = `carousel-item ${reminder.priority === 'high' ? 'high-priority' : ''}`;
        item.innerHTML = `
          <i class='bx ${reminder.priority === 'high' ? 'bx-error-circle' : 'bx-bell'} ${reminder.priority === 'medium' ? 'bx-alarm' : ''}'></i>
          <span>${reminder.text}</span>
        `;
        carouselTrack.appendChild(item);
      });
    }

    function showSlide(index) {
      const slides = document.querySelectorAll('.carousel-item');
      if (slides.length === 0) return;
      
      currentSlide = (index + slides.length) % slides.length;
      carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
    }

    const carouselPrev = document.getElementById('carouselPrev');
    const carouselNext = document.getElementById('carouselNext');
    
    if (carouselPrev) {
      carouselPrev.addEventListener('click', () => {
        showSlide(currentSlide - 1);
      });
    }

    if (carouselNext) {
      carouselNext.addEventListener('click', () => {
        showSlide(currentSlide + 1);
      });
    }

    // AUTO AVANCE DEL CARRUSEL
    let carouselInterval = setInterval(() => {
      showSlide(currentSlide + 1);
    }, 5000);

    // Pausar carrusel al hacer hover
    if (carouselTrack) {
      carouselTrack.addEventListener('mouseenter', () => {
        clearInterval(carouselInterval);
      });

      carouselTrack.addEventListener('mouseleave', () => {
        carouselInterval = setInterval(() => {
          showSlide(currentSlide + 1);
        }, 5000);
      });
    }

    // Función para actualizar el carrusel cuando se agregan nuevos recordatorios
    window.updateCarousel = function() {
      userReminders = JSON.parse(localStorage.getItem('userReminders')) || [];
      initializeCarousel();
      showSlide(0);
    };

    initializeCarousel();
    showSlide(0);
  }

  // CALCULADORA DE PRECIOS - Solo si existe
  const priceCalculatorForm = document.getElementById('priceCalculatorForm');
  if (priceCalculatorForm) {
    let currentCalculation = null;

    priceCalculatorForm.addEventListener('submit', function(e) {
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
      
      // Guardar cálculo actual para posible eliminación
      currentCalculation = {
        materialCost,
        toolsCost,
        hoursWorked,
        hourlyRate,
        additionalCosts,
        profitMargin,
        totalCost,
        salePrice,
        profitAmount,
        finalMargin
      };
      
      // Mostrar resultados
      document.getElementById('totalCost').textContent = '$' + totalCost.toFixed(2);
      document.getElementById('salePrice').textContent = '$' + salePrice.toFixed(2);
      document.getElementById('profitAmount').textContent = '$' + profitAmount.toFixed(2);
      document.getElementById('finalMargin').textContent = finalMargin + '%';
      
      document.getElementById('priceResult').style.display = 'block';
      
      // Actualizar botón de guardar para incluir opción de eliminar
      updateSaveButton();
    });

    function updateSaveButton() {
      const saveButton = document.getElementById('saveAsIncome');
      if (saveButton && currentCalculation) {
        // Crear contenedor para botones
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'calculation-actions';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '15px';
        
        buttonContainer.innerHTML = `
          <button type="button" class="btn" id="confirmSaveCalculation">
            <i class='bx bx-save'></i> Guardar como ingreso
          </button>
          <button type="button" class="btn danger" id="clearCalculation">
            <i class='bx bx-trash'></i> Eliminar cálculo
          </button>
        `;
        
        // Reemplazar el botón anterior
        const existingContainer = document.querySelector('.calculation-actions');
        if (existingContainer) {
          existingContainer.remove();
        }
        
        saveButton.parentNode.insertBefore(buttonContainer, saveButton);
        saveButton.style.display = 'none';
        
        // Event listeners para los nuevos botones
        document.getElementById('confirmSaveCalculation').addEventListener('click', saveCalculationAsIncome);
        document.getElementById('clearCalculation').addEventListener('click', clearCurrentCalculation);
      }
    }

    async function saveCalculationAsIncome() {
      if (!currentCalculation) {
        alert('No hay cálculo para guardar');
        return;
      }

      try {
        const res = await apiFetch("/entries", {
          method: "POST",
          body: {
            type: "INCOME",
            amount: parseFloat(currentCalculation.salePrice),
            note: "Venta de producto artesanal (calculado)",
            category: "ventas",
            payment_method: "transferencia"
          },
        });

        if (res.success) {
          alert("¡Precio guardado como ingreso!");
          loadData();
          clearCurrentCalculation();
        } else {
          alert("Error al guardar");
        }
      } catch (error) {
        alert("Error de conexión: " + error.message);
      }
    }

    function clearCurrentCalculation() {
      currentCalculation = null;
      document.getElementById('priceResult').style.display = 'none';
      
      // Restaurar botón original
      const saveButton = document.getElementById('saveAsIncome');
      const buttonContainer = document.querySelector('.calculation-actions');
      
      if (buttonContainer) {
        buttonContainer.remove();
      }
      
      if (saveButton) {
        saveButton.style.display = 'inline-flex';
      }
      
      // Limpiar formulario
      priceCalculatorForm.reset();
      document.getElementById('profitMarginInput').value = '30';
    }
  }

  // SISTEMA DE RECORDATORIOS PERSONALES MEJORADO - CON FECHAS Y PRIORIDAD AUTOMÁTICA
  const reminderForm = document.getElementById('reminderForm');
  if (reminderForm) {
    let userReminders = JSON.parse(localStorage.getItem('userReminders')) || [];

    // FUNCIÓN NUEVA: Calcular prioridad automática basada en fecha
    const calculateAutoPriority = (targetDate) => {
      const now = new Date();
      const target = new Date(targetDate);
      const diffTime = target - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
        return 'high'; // Fecha vencida o hoy
      } else if (diffDays <= 2) {
        return 'high'; // 1-2 días
      } else if (diffDays <= 7) {
        return 'medium'; // 3-7 días
      } else {
        return 'low'; // Más de 7 días
      }
    };

    // FUNCIÓN NUEVA: Calcular días restantes
    const getDaysRemaining = (targetDate) => {
      const now = new Date();
      const target = new Date(targetDate);
      const diffTime = target - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    // FUNCIÓN NUEVA: Formatear fecha de recordatorios con información de días
    const formatReminderDate = (dateString, targetDate = null) => {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return 'Fecha inválida';
        }
        
        let dateText = date.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Si hay fecha objetivo, agregar información de días restantes
        if (targetDate) {
          const daysRemaining = getDaysRemaining(targetDate);
          if (daysRemaining > 0) {
            dateText += ` (${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''})`;
          } else if (daysRemaining === 0) {
            dateText += ' (¡Hoy!)';
          } else {
            dateText += ` (Vencido hace ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) !== 1 ? 's' : ''})`;
          }
        }

        return dateText;
      } catch (error) {
        console.error('Error formateando fecha de recordatorio:', error);
        return 'Fecha no disponible';
      }
    };

    // FUNCIÓN NUEVA: Actualizar prioridades automáticamente
    const updateAutoPriorities = () => {
      let updated = false;
      userReminders.forEach(reminder => {
        if (reminder.targetDate && reminder.autoPriority) {
          const newPriority = calculateAutoPriority(reminder.targetDate);
          if (reminder.priority !== newPriority) {
            reminder.priority = newPriority;
            updated = true;
          }
        }
      });
      
      if (updated) {
        localStorage.setItem('userReminders', JSON.stringify(userReminders));
      }
      
      return updated;
    };

    function displayUserReminders() {
      const list = document.getElementById('userRemindersList');
      if (!list) return;
      
      list.innerHTML = '';
      
      if (userReminders.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="bx bx-bell"></i><p>No tienes recordatorios</p></div>';
        return;
      }
      
      // Actualizar prioridades antes de mostrar
      updateAutoPriorities();
      
      userReminders.forEach((reminder, index) => {
        const item = document.createElement('div');
        item.className = `reminder-item ${reminder.priority} ${reminder.targetDate ? 'has-target-date' : ''}`;
        
        const priorityLabels = {
          'low': 'Baja',
          'medium': 'Media', 
          'high': 'Alta'
        };
        
        const priorityIcons = {
          'low': 'bx-info-circle',
          'medium': 'bx-time',
          'high': 'bx-error-circle'
        };

        // Icono especial para recordatorios con fecha
        const getReminderIcon = (reminder) => {
          if (reminder.targetDate) {
            const daysRemaining = getDaysRemaining(reminder.targetDate);
            if (daysRemaining <= 0) return 'bx-alarm-exclamation';
            if (daysRemaining <= 2) return 'bx-alarm';
            return 'bx-calendar-event';
          }
          return priorityIcons[reminder.priority];
        };

        const reminderIcon = getReminderIcon(reminder);
        
        item.innerHTML = `
          <div class="reminder-content">
            <div class="reminder-header">
              <div class="reminder-text">${reminder.text}</div>
              ${reminder.targetDate ? `
                <div class="reminder-target-date">
                  <i class='bx bx-calendar-star'></i>
                  Para: ${new Date(reminder.targetDate).toLocaleDateString('es-ES')}
                </div>
              ` : ''}
            </div>
            <div class="reminder-meta">
              <div class="reminder-date">
                <i class='bx bx-calendar'></i>
                Creado: ${formatReminderDate(reminder.createdAt, reminder.targetDate)}
              </div>
              <div class="reminder-priority-tag ${reminder.autoPriority ? 'auto-priority' : ''}">
                <i class='bx ${reminderIcon}'></i>
                ${reminder.priority === 'auto' ? 'Auto' : priorityLabels[reminder.priority]}
                ${reminder.autoPriority ? ' (Auto)' : ''}
              </div>
            </div>
          </div>
          <div class="reminder-actions">
            ${reminder.targetDate ? `
              <button class="edit-reminder-btn" data-index="${index}" title="Editar recordatorio">
                <i class='bx bx-edit'></i>
              </button>
            ` : ''}
            <button class="delete-reminder-btn" data-index="${index}" title="Eliminar recordatorio">
              <i class='bx bx-trash'></i>
            </button>
          </div>
        `;
        list.appendChild(item);
      });
      
      // Event listeners para eliminar
      document.querySelectorAll('#userRemindersList .delete-reminder-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = parseInt(this.getAttribute('data-index'));
          if (confirm('¿Eliminar este recordatorio?')) {
            userReminders.splice(index, 1);
            localStorage.setItem('userReminders', JSON.stringify(userReminders));
            displayUserReminders();
            
            // Actualizar carrusel también
            if (window.updateCarousel) {
              window.updateCarousel();
            }
          }
        });
      });

      // Event listeners para editar
      document.querySelectorAll('#userRemindersList .edit-reminder-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = parseInt(this.getAttribute('data-index'));
          editReminder(index);
        });
      });
    }

    // FUNCIÓN NUEVA: Editar recordatorio
    function editReminder(index) {
      const reminder = userReminders[index];
      
      const newText = prompt('Editar texto del recordatorio:', reminder.text);
      if (newText === null) return; // Usuario canceló
      
      if (reminder.targetDate) {
        const currentDate = reminder.targetDate.split('T')[0];
        const newDate = prompt('Editar fecha objetivo (YYYY-MM-DD):', currentDate);
        if (newDate === null) return;
        
        if (newDate) {
          const dateObj = new Date(newDate + 'T23:59:59');
          if (isNaN(dateObj.getTime())) {
            alert('Fecha inválida. Usa el formato YYYY-MM-DD');
            return;
          }
          reminder.targetDate = dateObj.toISOString();
          
          // Si es prioridad automática, actualizar prioridad
          if (reminder.autoPriority) {
            reminder.priority = calculateAutoPriority(reminder.targetDate);
          }
        }
      }
      
      if (newText.trim()) {
        reminder.text = newText.trim();
        localStorage.setItem('userReminders', JSON.stringify(userReminders));
        displayUserReminders();
        
        // Actualizar carrusel
        if (window.updateCarousel) {
          window.updateCarousel();
        }
        
        alert('¡Recordatorio actualizado!');
      }
    }

    // MODIFICAR el event listener del formulario para soportar fechas
    reminderForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const text = document.getElementById('reminderText').value.trim();
      const priority = document.getElementById('reminderPriority').value;
      const targetDateInput = document.getElementById('reminderTargetDate');
      const targetDate = targetDateInput ? targetDateInput.value : null;
      
      if (!text) {
        alert('Por favor ingresa un texto para el recordatorio');
        return;
      }
      
      const reminderData = {
        text: text,
        priority: priority,
        createdAt: new Date().toISOString(),
        targetDate: null,
        autoPriority: false
      };
      
      // Si hay fecha objetivo y es prioridad automática
      if (targetDate && priority === 'auto') {
        const dateObj = new Date(targetDate + 'T23:59:59');
        if (isNaN(dateObj.getTime())) {
          alert('Fecha inválida. Usa el formato YYYY-MM-DD');
          return;
        }
        reminderData.targetDate = dateObj.toISOString();
        reminderData.autoPriority = true;
        reminderData.priority = calculateAutoPriority(reminderData.targetDate);
      }
      
      userReminders.push(reminderData);
      localStorage.setItem('userReminders', JSON.stringify(userReminders));
      displayUserReminders();
      this.reset();
      
      // Resetear selector de prioridad a 'low'
      document.getElementById('reminderPriority').value = 'low';
      // Ocultar campo de fecha
      const targetDateGroup = document.getElementById('targetDateGroup');
      if (targetDateGroup) {
        targetDateGroup.style.display = 'none';
      }
      
      // ACTUALIZAR CARRUSEL
      if (window.updateCarousel) {
        window.updateCarousel();
      }
      
      // Mostrar mensaje de éxito
      alert('¡Recordatorio agregado correctamente!');
    });

    // FUNCIÓN NUEVA: Actualizar selector de prioridad cuando cambie
    const prioritySelect = document.getElementById('reminderPriority');
    const targetDateGroup = document.getElementById('targetDateGroup');
    
    if (prioritySelect && targetDateGroup) {
      prioritySelect.addEventListener('change', function() {
        if (this.value === 'auto') {
          targetDateGroup.style.display = 'block';
        } else {
          targetDateGroup.style.display = 'none';
        }
      });
    }

    // Inicializar mostrando/ocultando el campo de fecha
    if (targetDateGroup && prioritySelect) {
      targetDateGroup.style.display = prioritySelect.value === 'auto' ? 'block' : 'none';
    }

    // Actualizar prioridades cada minuto
    setInterval(() => {
      if (updateAutoPriorities()) {
        displayUserReminders();
        if (window.updateCarousel) {
          window.updateCarousel();
        }
      }
    }, 60000); // Cada minuto

    displayUserReminders();
  }

  // NAVBAR MÓVIL - ESTILO TWITTER
  function initializeMobileNavbar() {
    const mobileNavbar = document.createElement('nav');
    mobileNavbar.className = 'mobile-navbar';
    mobileNavbar.innerHTML = `
      <ul class="mobile-nav-menu">
        <li class="mobile-nav-item">
          <a href="#" class="mobile-nav-link" data-section="dashboard">
            <i class='bx bx-home-alt mobile-nav-icon'></i>
            <span class="mobile-nav-text">Inicio</span>
          </a>
        </li>
        <li class="mobile-nav-item">
          <a href="#" class="mobile-nav-link" data-section="calculator">
            <i class='bx bx-calculator mobile-nav-icon'></i>
            <span class="mobile-nav-text">Calcular</span>
          </a>
        </li>
        <li class="mobile-nav-item">
          <a href="#" class="mobile-nav-link" data-section="reminders">
            <i class='bx bx-bell mobile-nav-icon'></i>
            <span class="mobile-nav-text">Recordatorios</span>
            <span class="notification-badge" id="notificationCount">0</span>
          </a>
        </li>
        <li class="mobile-nav-item">
          <a href="#" class="mobile-nav-link" data-section="account">
            <i class='bx bx-user mobile-nav-icon'></i>
            <span class="mobile-nav-text">Cuenta</span>
          </a>
        </li>
      </ul>
    `;
    
    document.body.appendChild(mobileNavbar);
    
    // Event listeners para el navbar móvil
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const section = this.getAttribute('data-section');
        
        // Remover activo de todos
        document.querySelectorAll('.mobile-nav-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        
        // Activar actual
        this.classList.add('active');
        const sectionElement = document.getElementById(section + 'Section');
        if (sectionElement) {
          sectionElement.classList.add('active');
        }
        
        // También activar el item del sidebar si existe
        const sidebarItem = document.querySelector(`.menu-item[data-section="${section}"]`);
        if (sidebarItem) {
          sidebarItem.classList.add('active');
        }
      });
    });
    
    // Actualizar badge de notificaciones
    function updateNotificationBadge() {
      const userReminders = JSON.parse(localStorage.getItem('userReminders')) || [];
      const highPriorityCount = userReminders.filter(r => r.priority === 'high').length;
      const badge = document.getElementById('notificationCount');
      if (badge) {
        badge.textContent = highPriorityCount > 0 ? highPriorityCount : '';
        badge.style.display = highPriorityCount > 0 ? 'flex' : 'none';
      }
    }
    
    // Actualizar badge cuando se carguen recordatorios
    window.updateNotificationBadge = updateNotificationBadge;
    updateNotificationBadge();
  }

  // INFORMACIÓN DE CUENTA - CON FECHA REAL
  function loadAccountInfo() {
    try {
      const accountUsername = document.getElementById('accountUsername');
      const accountEmail = document.getElementById('accountEmail');
      const accountSince = document.getElementById('accountSince');
      
      if (accountUsername && accountEmail && accountSince) {
        const token = localStorage.getItem('token');
        if (token) {
          const decoded = JSON.parse(atob(token.split('.')[1]));
          accountUsername.textContent = decoded.username || 'Usuario';
          accountEmail.textContent = decoded.email || 'No disponible';
          
          // FECHA REAL DE REGISTRO desde el token
          const joinDate = decoded.created_at ? new Date(decoded.created_at) : new Date();
          accountSince.textContent = joinDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }
    } catch (error) {
      console.error('Error cargando info de cuenta:', error);
    }
  }

  // Inicializar navbar móvil
  initializeMobileNavbar();
  loadAccountInfo();
}

console.log("app.js cargado completamente con método de pago y recordatorios inteligentes");