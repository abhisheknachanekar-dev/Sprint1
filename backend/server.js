require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health Check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "FarmEase API is running" });
});

// Public Stats (for landing page)
app.get("/api/stats/public", async (req, res) => {
    try {
        const [farmers] = await db.promise().query("SELECT COUNT(*) as count FROM users WHERE roll = 'user'");
        const [products] = await db.promise().query("SELECT COUNT(*) as count FROM products");
        const [services] = await db.promise().query("SELECT COUNT(*) as count FROM services");
        res.json({
            success: true,
            stats: {
                farmers: farmers[0].count,
                products: products[0].count,
                services: services[0].count
            }
        });
    } catch (error) {
        console.error("Public stats error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch stats." });
    }
});

// =====================================================
// AUTHENTICATION
// =====================================================

// Register
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        // Check if email already registered
        const [existingUsers] = await db.promise().query(
            "SELECT id FROM users WHERE email = ?",
            [cleanEmail]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into MySQL (database column is `roll`)
        await db.promise().query(
            `INSERT INTO users (name, email, password, roll)
             VALUES (?, ?, ?, 'user')`,
            [cleanName, cleanEmail, hashedPassword]
        );

        res.status(201).json({
            success: true,
            message: "Account created successfully! You can now log in."
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
});

// Login
app.post("/api/login", async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // Query user by email and optional role
        let sql = "SELECT * FROM users WHERE email = ?";
        const params = [cleanEmail];

        if (role) {
            sql += " AND roll = ?";
            params.push(role);
        }

        const [results] = await db.promise().query(sql, params);

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email, password or selected role."
            });
        }

        const user = results[0];

        // Verify password with bcrypt or fallback to plain comparison
        let passwordMatch = false;
        try {
            passwordMatch = await bcrypt.compare(password, user.password);
        } catch (e) {
            passwordMatch = false;
        }

        // Backward compatibility fallback for plain text passwords if any
        if (!passwordMatch && user.password === password) {
            passwordMatch = true;
        }

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email, password or selected role."
            });
        }

        res.json({
            success: true,
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.roll,
                phone: user.phone,
                address: user.address
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
});

// =====================================================
// PRODUCTS
// =====================================================

// Get all products (with optional ?category= filter)
app.get("/api/products", async (req, res) => {
    try {
        const { category } = req.query;
        let sql = "SELECT * FROM products";
        const params = [];

        if (category && category !== "all") {
            sql += " WHERE category = ?";
            params.push(category);
        }

        sql += " ORDER BY id ASC";

        const [products] = await db.promise().query(sql, params);
        res.json({ success: true, products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ success: false, message: "Failed to fetch products." });
    }
});

// Get single product
app.get("/api/products/:id", async (req, res) => {
    try {
        const [products] = await db.promise().query(
            "SELECT * FROM products WHERE id = ?",
            [req.params.id]
        );

        if (products.length === 0) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        res.json({ success: true, product: products[0] });
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({ success: false, message: "Failed to fetch product." });
    }
});

// =====================================================
// SERVICES
// =====================================================

// Get all services
app.get("/api/services", async (req, res) => {
    try {
        const [services] = await db.promise().query("SELECT * FROM services ORDER BY id ASC");
        res.json({ success: true, services });
    } catch (error) {
        console.error("Error fetching services:", error);
        res.status(500).json({ success: false, message: "Failed to fetch services." });
    }
});

// Book a service
app.post("/api/services/book", async (req, res) => {
    try {
        const { user_id, service_id, booking_date } = req.body;

        if (!user_id || !service_id) {
            return res.status(400).json({
                success: false,
                message: "User ID and Service ID are required."
            });
        }

        const date = booking_date || new Date().toISOString().split("T")[0];

        const [result] = await db.promise().query(
            `INSERT INTO service_bookings (user_id, service_id, booking_date, status)
             VALUES (?, ?, ?, 'Booked')`,
            [user_id, service_id, date]
        );

        res.status(201).json({
            success: true,
            message: "Service booked successfully!",
            bookingId: result.insertId
        });
    } catch (error) {
        console.error("Service booking error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to book service."
        });
    }
});

// Get user booked services
app.get("/api/services/user/:userId", async (req, res) => {
    try {
        const sql = `
            SELECT sb.id, sb.booking_date, sb.status, sb.created_at,
                   s.id as service_id, s.name, s.description, s.price
            FROM service_bookings sb
            JOIN services s ON sb.service_id = s.id
            WHERE sb.user_id = ?
            ORDER BY sb.id DESC
        `;
        const [services] = await db.promise().query(sql, [req.params.userId]);
        res.json({ success: true, services });
    } catch (error) {
        console.error("Error fetching user services:", error);
        res.status(500).json({ success: false, message: "Failed to fetch booked services." });
    }
});

// =====================================================
// ORDERS
// =====================================================

// Place Order
app.post("/api/orders", async (req, res) => {
    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        const {
            user_id,
            product_id,
            quantity = 1,
            price,
            total_amount,
            payment_method = "Card",
            delivery_address = ""
        } = req.body;

        if (!user_id) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: "User must be logged in to place an order."
            });
        }

        const finalTotal = total_amount || price || 0;

        // Insert order
        const [orderResult] = await connection.query(
            `INSERT INTO orders 
             (user_id, total_amount, payment_method, payment_status, order_status, delivery_address)
             VALUES (?, ?, ?, 'Paid', 'Confirmed', ?)`,
            [user_id, finalTotal, payment_method, delivery_address]
        );

        const orderId = orderResult.insertId;

        // Insert order items
        // Support either single product or array of items
        if (req.body.items && Array.isArray(req.body.items)) {
            for (const item of req.body.items) {
                await connection.query(
                    `INSERT INTO order_items (order_id, product_id, quantity, price)
                     VALUES (?, ?, ?, ?)`,
                    [orderId, item.product_id, item.quantity || 1, item.price]
                );
            }
        } else if (product_id) {
            await connection.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price)
                 VALUES (?, ?, ?, ?)`,
                [orderId, product_id, quantity, price || finalTotal]
            );
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: "Order placed successfully!",
            orderId: "FE" + orderId.toString().padStart(6, "0"),
            rawOrderId: orderId
        });
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error("Order error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to place order."
        });
    }
});

// Get user orders
app.get("/api/orders/user/:userId", async (req, res) => {
    try {
        const sql = `
            SELECT o.id, o.total_amount, o.payment_method, o.payment_status, o.order_status, 
                   o.delivery_address, o.created_at,
                   oi.product_id, oi.quantity, oi.price,
                   p.name as product_name, p.category as product_category
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
            ORDER BY o.id DESC
        `;

        const [rows] = await db.promise().query(sql, [req.params.userId]);

        // Group rows by order id
        const ordersMap = new Map();
        for (const row of rows) {
            if (!ordersMap.has(row.id)) {
                ordersMap.set(row.id, {
                    id: "FE" + row.id.toString().padStart(6, "0"),
                    rawId: row.id,
                    total_amount: Number(row.total_amount),
                    payment_method: row.payment_method,
                    payment_status: row.payment_status,
                    order_status: row.order_status,
                    delivery_address: row.delivery_address,
                    created_at: row.created_at,
                    product: row.product_name || "Farm Product",
                    price: Number(row.total_amount),
                    status: row.order_status,
                    date: new Date(row.created_at).toLocaleDateString(),
                    items: []
                });
            }

            if (row.product_id) {
                ordersMap.get(row.id).items.push({
                    product_id: row.product_id,
                    name: row.product_name,
                    quantity: row.quantity,
                    price: Number(row.price)
                });
            }
        }

        const orders = Array.from(ordersMap.values());
        res.json({ success: true, orders });
    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({ success: false, message: "Failed to fetch orders." });
    }
});

// =====================================================
// ADMIN PANEL
// =====================================================

// Admin Stats
app.get("/api/admin/stats", async (req, res) => {
    try {
        const [farmers] = await db.promise().query(
            "SELECT COUNT(*) as totalFarmers FROM users WHERE roll = 'user'"
        );
        const [orders] = await db.promise().query(
            "SELECT COUNT(*) as totalOrders, COALESCE(SUM(total_amount), 0) as totalRevenue FROM orders"
        );
        const [services] = await db.promise().query(
            "SELECT COUNT(*) as totalServices FROM service_bookings"
        );

        res.json({
            success: true,
            stats: {
                totalFarmers: farmers[0].totalFarmers,
                totalOrders: orders[0].totalOrders,
                totalRevenue: Number(orders[0].totalRevenue),
                totalServices: services[0].totalServices
            }
        });
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ success: false, message: "Failed to fetch admin stats." });
    }
});

// Admin Orders
app.get("/api/admin/orders", async (req, res) => {
    try {
        const sql = `
            SELECT o.id, o.total_amount, o.payment_method, o.payment_status, o.order_status, 
                   o.delivery_address, o.created_at,
                   u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
                   p.name as product_name, oi.quantity, oi.price as item_price
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            ORDER BY o.id DESC
        `;

        const [rows] = await db.promise().query(sql);

        const ordersMap = new Map();
        for (const row of rows) {
            if (!ordersMap.has(row.id)) {
                ordersMap.set(row.id, {
                    id: "FE" + row.id.toString().padStart(6, "0"),
                    rawId: row.id,
                    product: row.product_name || "Farm Product",
                    customer: row.customer_name,
                    customer_email: row.customer_email,
                    customer_phone: row.customer_phone,
                    delivery_address: row.delivery_address,
                    price: Number(row.total_amount),
                    payment_method: row.payment_method,
                    status: row.order_status,
                    date: new Date(row.created_at).toLocaleDateString()
                });
            }
        }

        res.json({ success: true, orders: Array.from(ordersMap.values()) });
    } catch (error) {
        console.error("Error fetching admin orders:", error);
        res.status(500).json({ success: false, message: "Failed to fetch admin orders." });
    }
});

// Admin Services
app.get("/api/admin/services", async (req, res) => {
    try {
        const sql = `
            SELECT sb.id, sb.booking_date, sb.status, sb.created_at,
                   u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
                   s.name as service_name, s.price as service_price
            FROM service_bookings sb
            JOIN users u ON sb.user_id = u.id
            JOIN services s ON sb.service_id = s.id
            ORDER BY sb.id DESC
        `;

        const [rows] = await db.promise().query(sql);

        const formatted = rows.map(r => ({
            id: "SRV" + r.id.toString().padStart(6, "0"),
            name: r.service_name,
            customer: r.customer_name,
            customer_email: r.customer_email,
            customer_phone: r.customer_phone,
            price: Number(r.service_price),
            date: r.booking_date ? new Date(r.booking_date).toLocaleDateString() : new Date(r.created_at).toLocaleDateString(),
            status: r.status
        }));

        res.json({ success: true, services: formatted });
    } catch (error) {
        console.error("Error fetching admin services:", error);
        res.status(500).json({ success: false, message: "Failed to fetch admin services." });
    }
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
    console.log(`FarmEase server running at http://localhost:${PORT}`);
});
