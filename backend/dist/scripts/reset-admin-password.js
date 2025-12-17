"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function resetAdminPassword() {
    const email = process.argv[2] || "admin@trackdesk.com";
    const newPassword = process.argv[3] || "password123";
    try {
        console.log(`🔐 Resetting password for admin user: ${email}\n`);
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            console.error(`❌ User with email ${email} not found!`);
            console.log("\n💡 Creating new admin user...");
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
            const newUser = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    firstName: "Admin",
                    lastName: "User",
                    role: "ADMIN",
                    status: "ACTIVE",
                },
            });
            await prisma.adminProfile.create({
                data: {
                    userId: newUser.id,
                    permissions: ["all"],
                    department: "Management",
                },
            });
            console.log("✅ Admin user created successfully!");
            console.log(`\n📝 Admin Credentials:`);
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${newPassword}`);
            await prisma.$disconnect();
            return;
        }
        if (user.role !== "ADMIN") {
            console.error(`❌ User ${email} is not an admin! Role: ${user.role}`);
            await prisma.$disconnect();
            process.exit(1);
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });
        console.log("✅ Password reset successfully!");
        console.log(`\n📝 Updated Admin Credentials:`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${newPassword}`);
        console.log(`\n⚠️  Please change this password after logging in!`);
    }
    catch (error) {
        console.error("❌ Error resetting password:", error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
resetAdminPassword();
//# sourceMappingURL=reset-admin-password.js.map