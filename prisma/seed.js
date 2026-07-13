const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Create 3 users for testing
  const users = [
    { email: 'dispatcher@aeroflow.test', name: 'Test Dispatcher', role: 'FLIGHT_DISPATCHER' },
    { email: 'crew@aeroflow.test', name: 'Test Crew', role: 'GROUND_CREW_LEAD' },
    { email: 'director@aeroflow.test', name: 'Test Director', role: 'OPERATIONS_DIRECTOR' }
  ]

  console.log('Seeding users...')
  for (const u of users) {
    await prisma.users.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    })
  }
  console.log('Users seeded!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
