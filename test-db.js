const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const eq = await prisma.groundEquipment.count();
    console.log("Equipment count:", eq);
    
    const flights = await prisma.flights.count();
    console.log("Flights count:", flights);
    
    const logs = await prisma.shiftLogs.count();
    console.log("Shift logs count:", logs);
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
check();
