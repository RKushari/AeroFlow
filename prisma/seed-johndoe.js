const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  await prisma.users.upsert({
    where: { email: 'johndoe@gmail.com' },
    update: { name: 'John Doe', role: 'OPERATIONS_DIRECTOR' },
    create: { email: 'johndoe@gmail.com', name: 'John Doe', role: 'OPERATIONS_DIRECTOR' },
  })
  console.log('John Doe user seeded!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
