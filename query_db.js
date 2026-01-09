const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: 'new-test-org' }
    });
    
    if (org) {
      console.log('Organization found:');
      console.log(JSON.stringify({
        id: org.id,
        name: org.name,
        slug: org.slug,
        clerkOrgId: org.clerkOrgId
      }, null, 2));
    } else {
      console.log('Organization not found with slug: new-test-org');
    }
  } catch (error) {
    console.error('Error querying database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
