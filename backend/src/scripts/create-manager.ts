import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createManager() {
  const email = process.argv[2] || "manager@trackdesk.com";
  const password = process.argv[3] || "Manager123!";
  const firstName = process.argv[4] || "Manager";
  const lastName = process.argv[5] || "User";

  try {
    console.log(`👤 Creating manager user: ${email}\n`);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`⚠️  User with email ${email} already exists!`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Status: ${existingUser.status}`);
      
      // If user exists but is not a manager, update to manager
      if (existingUser.role !== "MANAGER") {
        console.log(`\n🔄 Updating user role to MANAGER...`);
        await prisma.user.update({
          where: { email },
          data: { role: "MANAGER", status: "ACTIVE" },
        });
        console.log("✅ User role updated to MANAGER!");
      }
      
      // Reset password
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      });
      
      console.log("✅ Password updated!");
      console.log(`\n📝 Manager Credentials:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      await prisma.$disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create manager user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "MANAGER",
        status: "ACTIVE",
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: newUser.id,
        action: "user_created",
        resource: "User Account",
        details: `Manager user created: ${email}`,
        ipAddress: "127.0.0.1",
        userAgent: "Trackdesk Script",
      },
    });

    console.log("✅ Manager user created successfully!");
    console.log(`\n📝 Manager Credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   First Name: ${firstName}`);
    console.log(`   Last Name: ${lastName}`);
    console.log(`   Role: MANAGER`);
    console.log(`   Status: ACTIVE`);
    console.log(`\n🔗 Login URL: http://localhost:3000/auth/login`);
    
  } catch (error) {
    console.error("❌ Error creating manager user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createManager();




