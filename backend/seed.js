const bcrypt = require("bcrypt");
const db = require("./db");

async function seedDatabase() {
    console.log("Seeding database...");

    try {
        // 1. Seed Services if empty
        const [services] = await db.promise().query("SELECT COUNT(*) as count FROM services");
        if (services[0].count === 0) {
            const initialServices = [
                { id: 1, name: "Tractor Rental", description: "Rent modern tractors and farming equipment according to your field requirements.", price: 800.00 },
                { id: 2, name: "Soil Testing", description: "Get professional soil analysis and recommendations for better crop growth.", price: 500.00 },
                { id: 3, name: "Irrigation Setup", description: "Professional drip and sprinkler irrigation installation for your farm.", price: 2500.00 },
                { id: 4, name: "Crop Consultation", description: "Get advice from agriculture experts about crops, diseases and farming practices.", price: 700.00 }
            ];

            for (const s of initialServices) {
                await db.promise().query(
                    "INSERT INTO services (id, name, description, price) VALUES (?, ?, ?, ?)",
                    [s.id, s.name, s.description, s.price]
                );
            }
            console.log("Services seeded successfully.");
        } else {
            console.log(`Services table already has ${services[0].count} records.`);
        }

        // 2. Seed Default Admin User if not exists
        const [adminUsers] = await db.promise().query(
            "SELECT id FROM users WHERE email = ?",
            ["admin@farmease.com"]
        );

        if (adminUsers.length === 0) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            await db.promise().query(
                `INSERT INTO users (name, email, password, roll, phone, address) 
                 VALUES (?, ?, ?, 'admin', ?, ?)`,
                [
                    "FarmEase Admin",
                    "admin@farmease.com",
                    hashedPassword,
                    "+91 9876543210",
                    "FarmEase HQ, Bengaluru, India"
                ]
            );
            console.log("Default Admin user created: admin@farmease.com / admin123");
        } else {
            console.log("Admin user already exists.");
        }

        // 3. Seed a Demo Farmer User if not exists
        const [demoFarmers] = await db.promise().query(
            "SELECT id FROM users WHERE email = ?",
            ["farmer@farmease.com"]
        );

        if (demoFarmers.length === 0) {
            const hashedPassword = await bcrypt.hash("farmer123", 10);
            await db.promise().query(
                `INSERT INTO users (name, email, password, roll, phone, address) 
                 VALUES (?, ?, ?, 'user', ?, ?)`,
                [
                    "Ramesh Kumar",
                    "farmer@farmease.com",
                    hashedPassword,
                    "+91 9123456780",
                    "Village GreenField, Plot 14, Punjab"
                ]
            );
            console.log("Demo Farmer user created: farmer@farmease.com / farmer123");
        } else {
            console.log("Demo Farmer user already exists.");
        }

        console.log("Database seeding completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}

seedDatabase();
