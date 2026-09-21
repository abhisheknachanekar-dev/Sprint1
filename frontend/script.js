/* =====================================================
   FarmEase - Frontend Application Logic
   100% Database-Driven via Express REST API & MySQL
   (No localStorage used for application data)
===================================================== */

const API_BASE = "http://localhost:3000/api";

let selectedRole = "user";
let currentCheckoutProduct = null;

/* =====================================================
   AUTH: ROLE SELECTION
===================================================== */

function selectRole(role) {
    selectedRole = role;

    const userBtn = document.getElementById("userRoleBtn");
    const adminBtn = document.getElementById("adminRoleBtn");

    if (!userBtn || !adminBtn) return;

    if (role === "user") {
        userBtn.classList.add("active");
        adminBtn.classList.remove("active");
    } else {
        adminBtn.classList.add("active");
        userBtn.classList.remove("active");
    }
}

/* =====================================================
   AUTH: LOGIN
===================================================== */

async function loginUser(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const error = document.getElementById("loginError");

    error.textContent = "";

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password,
                role: selectedRole
            })
        });

        const result = await response.json();

        if (result.success && result.user) {
            // Keep active session in browser tab memory
            sessionStorage.setItem("farmEaseUser", JSON.stringify(result.user));

            if (result.user.role === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "dashboard.html";
            }
        } else {
            error.textContent = result.message || "Invalid email, password or role.";
        }
    } catch (err) {
        console.error("Login error:", err);
        error.textContent = "Unable to connect to the database server. Please ensure backend is running.";
    }
}

/* =====================================================
   AUTH: REGISTRATION
===================================================== */

function showRegisterForm() {
    const container = document.getElementById("registerFormContainer");
    const option = document.querySelector(".register-option");
    if (container) container.classList.add("show");
    if (option) option.style.display = "none";
    const nameInput = document.getElementById("registerName");
    if (nameInput) nameInput.focus();
}

function hideRegisterForm() {
    const container = document.getElementById("registerFormContainer");
    const option = document.querySelector(".register-option");
    if (container) container.classList.remove("show");
    if (option) option.style.display = "flex";
    const msg = document.getElementById("registerMessage");
    if (msg) msg.textContent = "";
}

async function registerUser(event) {
    event.preventDefault();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("registerConfirmPassword").value;
    const message = document.getElementById("registerMessage");

    if (password !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        message.className = "register-message error";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        });

        const result = await response.json();

        if (result.success) {
            message.textContent = result.message;
            message.className = "register-message success";

            const form = document.getElementById("registerFormContainer").querySelector("form");
            if (form) form.reset();

            setTimeout(() => {
                hideRegisterForm();
                const loginEmail = document.getElementById("loginEmail");
                if (loginEmail) loginEmail.value = email;
            }, 1200);
        } else {
            message.textContent = result.message;
            message.className = "register-message error";
        }
    } catch (error) {
        console.error("Registration error:", error);
        message.textContent = "Unable to connect to the server.";
        message.className = "register-message error";
    }
}

/* =====================================================
   AUTH: SESSION HELPERS
===================================================== */

function getLoggedInUser() {
    try {
        return JSON.parse(sessionStorage.getItem("farmEaseUser"));
    } catch (e) {
        return null;
    }
}

function logoutUser() {
    sessionStorage.removeItem("farmEaseUser");
    window.location.href = "login.html";
}

function updateNavbarAuth() {
    const nav = document.querySelector(".navbar nav");
    const loggedUser = getLoggedInUser();

    if (!nav) return;

    // Look for Login link in nav
    const loginLink = Array.from(nav.querySelectorAll("a")).find(a => 
        a.getAttribute("href") === "login.html" || a.textContent.trim() === "Login"
    );

    if (loggedUser) {
        if (loginLink) {
            if (loggedUser.role === "admin") {
                loginLink.href = "admin.html";
                loginLink.innerHTML = `👨‍💼 ${loggedUser.name}`;
            } else {
                loginLink.href = "dashboard.html";
                loginLink.innerHTML = `👨‍🌾 ${loggedUser.name}`;
            }
        }

        // Add Logout button in navbar if not present and on non-admin page
        if (!document.getElementById("navLogoutBtn") && !document.querySelector(".navbar .nav-btn[onclick*='logout']")) {
            const logoutBtn = document.createElement("button");
            logoutBtn.id = "navLogoutBtn";
            logoutBtn.className = "nav-btn";
            logoutBtn.style.marginLeft = "10px";
            logoutBtn.textContent = "Logout";
            logoutBtn.onclick = logoutUser;
            const header = document.querySelector(".navbar");
            if (header) header.appendChild(logoutBtn);
        }
    }
}

/* =====================================================
   PRODUCTS & MARKETPLACE (MYSQL DATABASE)
===================================================== */

function getCategoryIcon(category, name) {
    const cat = (category || "").toLowerCase();
    const nm = (name || "").toLowerCase();
    if (nm.includes("tomato")) return "🍅";
    if (nm.includes("wheat")) return "🌾";
    if (nm.includes("drip")) return "💧";
    if (nm.includes("sprayer")) return "🚿";
    if (nm.includes("neem")) return "🌿";
    if (cat.includes("seed")) return "🌾";
    if (cat.includes("fertilizer")) return "🌱";
    if (cat.includes("equipment")) return "🚜";
    if (cat.includes("pesticide")) return "🪴";
    return "🌱";
}

let products = [];

async function fetchProductsFromDatabase() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();
        if (data.success && data.products) {
            products = data.products.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                price: Number(p.price),
                icon: getCategoryIcon(p.category, p.name),
                description: p.description
            }));
        }
    } catch (err) {
        console.error("Could not fetch products from database:", err);
    }
}

function displayProducts() {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");

    const search = searchInput ? searchInput.value.toLowerCase() : "";
    const category = categoryFilter ? categoryFilter.value : "all";

    const filtered = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(search);
        const matchesCategory = category === "all" || product.category === category;
        return matchesSearch && matchesCategory;
    });

    grid.innerHTML = "";

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty">No products found.</div>`;
        return;
    }

    filtered.forEach(product => {
        grid.innerHTML += `
            <div class="product-card">
                <div class="product-image">${product.icon}</div>
                <div class="product-info">
                    <span class="product-category">${product.category.toUpperCase()}</span>
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <div class="product-price">
                        <strong>₹${product.price}</strong>
                        <button class="buy-btn" onclick="buyProduct(${product.id})">Buy Now</button>
                    </div>
                </div>
            </div>
        `;
    });
}

function buyProduct(productId) {
    // Navigate with product ID in URL - no localStorage used!
    window.location.href = `buy.html?id=${productId}`;
}

/* =====================================================
   CHECKOUT & ORDERS (MYSQL DATABASE)
===================================================== */

async function loadCheckout() {
    const container = document.getElementById("checkoutProduct");
    if (!container) return;

    // Get product ID directly from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");

    if (!productId) {
        container.innerHTML = `
            <div class="empty">
                No product selected.<br><br>
                <a href="marketplace.html" class="btn primary-btn">Go to Marketplace</a>
            </div>
        `;
        return;
    }

    container.innerHTML = `<div class="empty">Loading product details from database...</div>`;

    try {
        // Fetch product live from MySQL database
        const response = await fetch(`${API_BASE}/products/${productId}`);
        const data = await response.json();

        if (!data.success || !data.product) {
            container.innerHTML = `
                <div class="empty">
                    Product not found in database.<br><br>
                    <a href="marketplace.html" class="btn primary-btn">Back to Marketplace</a>
                </div>
            `;
            return;
        }

        const product = data.product;
        product.price = Number(product.price);
        product.icon = getCategoryIcon(product.category, product.name);

        // Retain active product in memory
        currentCheckoutProduct = product;

        // Pre-fill user data if logged in
        const loggedUser = getLoggedInUser();
        if (loggedUser) {
            const nameField = document.getElementById("customerName");
            const mobileField = document.getElementById("mobile");
            const addressField = document.getElementById("address");

            if (nameField && !nameField.value && loggedUser.name) nameField.value = loggedUser.name;
            if (mobileField && !mobileField.value && loggedUser.phone) mobileField.value = loggedUser.phone;
            if (addressField && !addressField.value && loggedUser.address) addressField.value = loggedUser.address;
        }

        container.innerHTML = `
            <div class="checkout-item">
                <div class="checkout-item-image">${product.icon}</div>
                <div>
                    <h3>${product.name}</h3>
                    <p>${product.description || ""}</p>
                    <strong>₹${product.price}</strong>
                </div>
            </div>
            <hr style="margin:25px 0">
            <div style="display:flex; justify-content:space-between;">
                <strong>Total Amount</strong>
                <strong>₹${product.price}</strong>
            </div>
        `;
    } catch (err) {
        console.error("Error loading checkout product:", err);
        container.innerHTML = `<div class="empty">Error loading product from database.</div>`;
    }
}

async function processPayment(event) {
    event.preventDefault();

    if (!currentCheckoutProduct) {
        alert("Product information is missing. Please select a product from Marketplace.");
        window.location.href = "marketplace.html";
        return;
    }

    const loggedUser = getLoggedInUser();
    if (!loggedUser) {
        alert("Please log in first to place an order.");
        window.location.href = "login.html";
        return;
    }

    const customerName = document.getElementById("customerName").value;
    const mobile = document.getElementById("mobile").value;
    const address = document.getElementById("address").value;
    const paymentMethod = document.getElementById("paymentMethod").value;

    try {
        // Send order directly to MySQL orders & order_items tables
        const response = await fetch(`${API_BASE}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: loggedUser.id,
                product_id: currentCheckoutProduct.id,
                quantity: 1,
                price: currentCheckoutProduct.price,
                total_amount: currentCheckoutProduct.price,
                payment_method: paymentMethod,
                delivery_address: `${address} (Customer: ${customerName}, Phone: ${mobile})`
            })
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById("orderId").textContent = result.orderId;
            document.getElementById("successModal").style.display = "flex";
            currentCheckoutProduct = null;
            updateCartCount();
        } else {
            alert(result.message || "Failed to place order.");
        }
    } catch (err) {
        console.error("Order error:", err);
        alert("Unable to connect to the database server.");
    }
}

/* =====================================================
   SERVICES (MYSQL DATABASE)
===================================================== */

const serviceIcons = {
    1: "🚜",
    2: "🧪",
    3: "💧",
    4: "👨‍🌾"
};

async function loadServicesFromDatabase() {
    const container = document.getElementById("servicesContainer");
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/services`);
        const data = await response.json();

        if (data.success && data.services && data.services.length > 0) {
            container.innerHTML = "";
            data.services.forEach(srv => {
                const icon = serviceIcons[srv.id] || "🌱";
                container.innerHTML += `
                    <div class="service-card">
                        <div class="service-image">${icon}</div>
                        <div class="service-content">
                            <span class="service-category">AGRICULTURAL SERVICE</span>
                            <h2>${srv.name}</h2>
                            <p>${srv.description || ""}</p>
                            <div class="service-bottom">
                                <strong>₹${Number(srv.price)}</strong>
                                <button onclick="bookService('${srv.name}', ${srv.price}, ${srv.id})">Book Service</button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
    } catch (err) {
        console.error("Error loading services from database:", err);
    }
}

async function bookService(serviceName, price, serviceId) {
    const loggedUser = getLoggedInUser();

    if (!loggedUser) {
        alert("Please log in first to book a service.");
        window.location.href = "login.html";
        return;
    }

    try {
        // Save booking directly into MySQL service_bookings table
        const response = await fetch(`${API_BASE}/services/book`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: loggedUser.id,
                service_id: serviceId || 1,
                booking_date: new Date().toISOString().split("T")[0]
            })
        });

        const result = await response.json();

        if (result.success) {
            alert(`${serviceName} booked successfully!`);
            window.location.href = "dashboard.html";
        } else {
            alert(result.message || "Failed to book service.");
        }
    } catch (err) {
        console.error("Service booking error:", err);
        alert("Unable to connect to the database server.");
    }
}

/* =====================================================
   FARMER DASHBOARD (MYSQL DATABASE)
===================================================== */

async function loadDashboard() {
    const totalOrders = document.getElementById("totalOrders");
    if (!totalOrders) return; // Not on dashboard page

    const loggedUser = getLoggedInUser();

    if (!loggedUser) {
        alert("Please log in to view your dashboard.");
        window.location.href = "login.html";
        return;
    }

    // Update greeting with farmer's name
    const headingEl = document.querySelector(".dashboard-header h1");
    if (headingEl && loggedUser.name) {
        headingEl.innerHTML = `${loggedUser.name}'s Dashboard 👨‍🌾`;
    }

    try {
        // Fetch personal orders and services directly from MySQL
        const [ordersRes, servicesRes] = await Promise.all([
            fetch(`${API_BASE}/orders/user/${loggedUser.id}`),
            fetch(`${API_BASE}/services/user/${loggedUser.id}`)
        ]);

        const ordersData = await ordersRes.json();
        const servicesData = await servicesRes.json();

        const orders = ordersData.success ? ordersData.orders : [];
        const services = servicesData.success ? servicesData.services : [];

        const totalOrdersEl = document.getElementById("totalOrders");
        const totalServicesEl = document.getElementById("totalServices");
        const totalSpentEl = document.getElementById("totalSpent");

        if (totalOrdersEl) totalOrdersEl.textContent = orders.length;
        if (totalServicesEl) totalServicesEl.textContent = services.length;

        let spent = 0;
        orders.forEach(o => spent += Number(o.price || o.total_amount || 0));
        services.forEach(s => spent += Number(s.price || 0));

        if (totalSpentEl) totalSpentEl.textContent = "₹" + spent;

        loadOrders(orders);
        loadServices(services);
    } catch (err) {
        console.error("Error loading dashboard from database:", err);
    }
}

function loadOrders(orders) {
    const container = document.getElementById("ordersList");
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty">
                No orders yet.<br><br>
                <a href="marketplace.html" class="btn primary-btn">Shop Products</a>
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    orders.forEach(order => {
        container.innerHTML += `
            <div class="order-item">
                <div>
                    <strong>${order.product}</strong><br>
                    <small>Order #${order.id}</small><br>
                    <small>${order.date}</small>
                </div>
                <div>
                    <strong>₹${order.price}</strong><br>
                    <span class="status">${order.status}</span>
                </div>
            </div>
        `;
    });
}

function loadServices(services) {
    const container = document.getElementById("servicesList");
    if (!container) return;

    if (services.length === 0) {
        container.innerHTML = `
            <div class="empty">
                No services booked yet.<br><br>
                <a href="services.html" class="btn primary-btn">Explore Services</a>
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    services.forEach(service => {
        const formattedDate = service.booking_date 
            ? new Date(service.booking_date).toLocaleDateString()
            : new Date(service.created_at).toLocaleDateString();

        container.innerHTML += `
            <div class="order-item">
                <div>
                    <strong>${service.name}</strong><br>
                    <small>${formattedDate}</small>
                </div>
                <div>
                    <strong>₹${service.price}</strong><br>
                    <span class="status">${service.status}</span>
                </div>
            </div>
        `;
    });
}

/* =====================================================
   ADMIN DASHBOARD (MYSQL DATABASE)
===================================================== */

async function loadAdminDashboard() {
    const adminOrdersList = document.getElementById("adminOrdersList");
    if (!adminOrdersList) return; // Not on admin page

    const loggedUser = getLoggedInUser();

    if (!loggedUser || loggedUser.role !== "admin") {
        alert("Admin access required. Please log in as an administrator.");
        window.location.href = "login.html";
        return;
    }

    try {
        // Fetch all admin statistics and records from MySQL
        const [statsRes, ordersRes, servicesRes] = await Promise.all([
            fetch(`${API_BASE}/admin/stats`),
            fetch(`${API_BASE}/admin/orders`),
            fetch(`${API_BASE}/admin/services`)
        ]);

        const statsData = await statsRes.json();
        const ordersData = await ordersRes.json();
        const servicesData = await servicesRes.json();

        if (statsData.success) {
            const adminFarmers = document.getElementById("adminFarmers");
            const adminOrders = document.getElementById("adminOrders");
            const adminRevenue = document.getElementById("adminRevenue");

            if (adminFarmers) adminFarmers.textContent = statsData.stats.totalFarmers;
            if (adminOrders) adminOrders.textContent = statsData.stats.totalOrders;
            if (adminRevenue) adminRevenue.textContent = "₹" + statsData.stats.totalRevenue;
        }

        const orders = ordersData.success ? ordersData.orders : [];
        const services = servicesData.success ? servicesData.services : [];

        // Render Admin Orders
        if (orders.length === 0) {
            adminOrdersList.innerHTML = `<div class="empty">No orders available.</div>`;
        } else {
            adminOrdersList.innerHTML = "";
            orders.forEach(order => {
                adminOrdersList.innerHTML += `
                    <div class="order-item">
                        <div>
                            <strong>${order.product}</strong><br>
                            <small>#${order.id}</small><br>
                            <small>Customer: ${order.customer || "Farmer"}</small>
                        </div>
                        <div>
                            <strong>₹${order.price}</strong><br>
                            <span class="status">${order.status}</span>
                        </div>
                    </div>
                `;
            });
        }

        // Render Admin Services
        const adminServicesList = document.getElementById("adminServicesList");
        if (adminServicesList) {
            if (services.length === 0) {
                adminServicesList.innerHTML = `<div class="empty">No services booked.</div>`;
            } else {
                adminServicesList.innerHTML = "";
                services.forEach(service => {
                    adminServicesList.innerHTML += `
                        <div class="order-item">
                            <div>
                                <strong>${service.name}</strong><br>
                                <small>${service.date}</small><br>
                                <small>Customer: ${service.customer || "Farmer"}</small>
                            </div>
                            <div>
                                <strong>₹${service.price}</strong><br>
                                <span class="status">${service.status}</span>
                            </div>
                        </div>
                    `;
                });
            }
        }
    } catch (err) {
        console.error("Error loading admin dashboard from database:", err);
    }
}

/* =====================================================
   PUBLIC METRICS (HOME PAGE)
===================================================== */

async function loadPublicStats() {
    const homeFarmers = document.getElementById("homeFarmers");
    if (!homeFarmers) return;

    try {
        const response = await fetch(`${API_BASE}/stats/public`);
        const data = await response.json();

        if (data.success && data.stats) {
            const homeProducts = document.getElementById("homeProducts");
            const homeServices = document.getElementById("homeServices");

            if (homeFarmers) homeFarmers.textContent = `${data.stats.farmers}+`;
            if (homeProducts) homeProducts.textContent = `${data.stats.products}+`;
            if (homeServices) homeServices.textContent = `${data.stats.services}+`;
        }
    } catch (err) {
        console.warn("Could not load public stats:", err);
    }
}

/* =====================================================
   PAYMENT METHOD SELECTION
===================================================== */

function setupPaymentMethod() {
    const payment = document.getElementById("paymentMethod");
    const cardDetails = document.getElementById("cardDetails");

    if (!payment || !cardDetails) return;

    payment.addEventListener("change", function () {
        if (this.value === "Card") {
            cardDetails.style.display = "block";
        } else {
            cardDetails.style.display = "none";
        }
    });
}

/* =====================================================
   CART COUNT (FROM DATABASE ORDERS)
===================================================== */

function updateCartCount() {
    const count = document.getElementById("cartCount");
    if (!count) return;

    const loggedUser = getLoggedInUser();
    if (!loggedUser) {
        count.textContent = "0";
        return;
    }

    fetch(`${API_BASE}/orders/user/${loggedUser.id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.orders) {
                count.textContent = data.orders.length;
            }
        })
        .catch(() => {
            count.textContent = "0";
        });
}

/* =====================================================
   PAGE INITIALIZATION
===================================================== */

document.addEventListener("DOMContentLoaded", async function () {
    updateNavbarAuth();

    // Home Page
    loadPublicStats();

    // Services Page
    if (document.getElementById("servicesContainer")) {
        loadServicesFromDatabase();
    }

    // Marketplace Page
    if (document.getElementById("productGrid")) {
        await fetchProductsFromDatabase();
        displayProducts();
    }

    // Checkout Page
    if (document.getElementById("checkoutProduct")) {
        loadCheckout();
    }

    // Dashboard Page
    if (document.getElementById("totalOrders")) {
        loadDashboard();
    }

    // Admin Dashboard Page
    if (document.getElementById("adminOrdersList")) {
        loadAdminDashboard();
    }

    setupPaymentMethod();
    updateCartCount();
});
