import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const TEST_PASSWORD = 'Password123!';
const TEST_IMAGE_URL =
  'https://pixabay.com/fr/images/download/betidraws-halloween-10459025_1920.png';

async function createPrisma() {
  const connectionString =
    process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL ou DIRECT_URL est requis pour le seed');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return { prisma, pool };
}

async function main() {
  const { prisma, pool } = await createPrisma();

  try {
    console.log('Reset des tables pour le seed de test...');
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "MerchantContactResponse",
        "MerchantContact",
        "MerchantFeedback",
        "OrderItem",
        "CartItem",
        "ProductLike",
        "ProductShare",
        "ProductImage",
        "CommentReply",
        "ProductComment",
        "Notification",
        "Message",
        "Subscription",
        "Status",
        "Service",
        "Cart",
        "Order",
        "Product",
        "Shop",
        "CategorieProd",
        "CategorieShop",
        "User"
      RESTART IDENTITY CASCADE;
    `);

    const password = await bcrypt.hash(TEST_PASSWORD, 10);

    await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`);
    await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MODERATOR'`);

    const ready = {
      password,
      isVerified: true,
      phoneVerified: true,
      isProfileCompleted: true,
      profileCompletion: 100,
      onboardingStep: 'completed' as const,
      city: 'Dakar',
      department: 'Dakar',
      commune: 'Dakar Plateau',
      country: 'Sénégal',
      photo: TEST_IMAGE_URL,
    };

    const superAdmin = await prisma.user.create({
      data: {
        ...ready,
        email: 'superadmin@bibomarket.test',
        phoneNumber: '+221777065468',
        role: 'SUPER_ADMIN',
        firstName: 'Seynabou',
        lastName: 'Fall',
      },
    });
    const admin = await prisma.user.create({
      data: {
        ...ready,
        email: 'admin@bibomarket.test',
        phoneNumber: '+221770000001',
        role: 'ADMIN',
        firstName: 'Awa',
        lastName: 'Diop',
      },
    });
    const moderator = await prisma.user.create({
      data: {
        ...ready,
        email: 'moderateur@bibomarket.test',
        phoneNumber: '+221770000004',
        role: 'MODERATOR',
        firstName: 'Ibrahima',
        lastName: 'Ba',
      },
    });
    const merchant = await prisma.user.create({
      data: {
        ...ready,
        email: 'merchant@bibomarket.test',
        phoneNumber: '+221770000002',
        whatsappNumber: '+221770000002',
        role: 'MERCHANT',
        firstName: 'Mamadou',
        lastName: 'Ndiaye',
        address: 'Médina, Dakar',
      },
    });
    const supplier = await prisma.user.create({
      data: {
        ...ready,
        email: 'fournisseur@bibomarket.test',
        phoneNumber: '+221770000005',
        role: 'SUPPLIER',
        firstName: 'Ousmane',
        lastName: 'Diallo',
      },
    });
    const client = await prisma.user.create({
      data: {
        ...ready,
        email: 'client@bibomarket.test',
        phoneNumber: '+221770000003',
        role: 'CLIENT',
        firstName: 'Fatou',
        lastName: 'Sarr',
      },
    });

    const alimentation = await prisma.categorieShop.create({
      data: {
        name: 'Alimentation',
        description: 'Produits alimentaires et boissons',
      },
    });
    const mode = await prisma.categorieShop.create({
      data: {
        name: 'Mode & Beauté',
        description: 'Vêtements, chaussures et cosmétique',
      },
    });
    const electronique = await prisma.categorieShop.create({
      data: {
        name: 'Électronique',
        description: 'Téléphones, accessoires et électroménager',
      },
    });

    const [cereales, vetements, telephones] = await Promise.all([
      prisma.categorieProd.create({
        data: { name: 'Céréales', categorieShopId: alimentation.id },
      }),
      prisma.categorieProd.create({
        data: { name: 'Vêtements', categorieShopId: mode.id },
      }),
      prisma.categorieProd.create({
        data: { name: 'Téléphones', categorieShopId: electronique.id },
      }),
    ]);

    const shop = await prisma.shop.create({
      data: {
        name: 'Boutique Ndiaye',
        description: 'Boutique de test pour le marketplace Bibo Market',
        logo: TEST_IMAGE_URL,
        phoneNumber: '+221770000010',
        address: 'Sandaga, Dakar',
        userId: merchant.id,
        categorieShopId: alimentation.id,
        verifiedBadge: true,
        status: true,
      },
    });

    const riz = await prisma.product.create({
      data: {
        name: 'Riz parfumé 5kg',
        description: 'Sac de riz parfumé pour tests API',
        price: 4500,
        stock: 50,
        status: 'PUBLISHED',
        shopId: shop.id,
        userId: merchant.id,
        categorieProdId: cereales.id,
        images: {
          create: {
            imageUrl: TEST_IMAGE_URL,
          },
        },
      },
    });

    const boubou = await prisma.product.create({
      data: {
        name: 'Boubou brodé',
        description: 'Boubou traditionnel — produit de test',
        price: 15000,
        stock: 12,
        status: 'PUBLISHED',
        shopId: shop.id,
        userId: merchant.id,
        categorieProdId: vetements.id,
        images: {
          create: {
            imageUrl: TEST_IMAGE_URL,
          },
        },
      },
    });

    await prisma.product.create({
      data: {
        name: 'Smartphone test (brouillon)',
        description: 'Ne doit pas apparaître comme publié',
        price: 85000,
        stock: 3,
        status: 'DRAFT',
        shopId: shop.id,
        userId: merchant.id,
        categorieProdId: telephones.id,
        images: {
          create: { imageUrl: TEST_IMAGE_URL },
        },
      },
    });

    const cart = await prisma.cart.create({
      data: {
        userId: client.id,
        items: {
          create: { productId: riz.id, quantity: 2 },
        },
      },
    });

    const order = await prisma.order.create({
      data: {
        clientId: client.id,
        totalAmount: 4500 * 2,
        status: 'PENDING',
        paymentMethod: 'CASH_ON_DELIVERY',
        orderItems: {
          create: {
            productId: riz.id,
            quantity: 2,
            price: 4500,
          },
        },
      },
    });

    await prisma.productComment.create({
      data: {
        productId: riz.id,
        userId: client.id,
        comment: 'Bon rapport qualité/prix (commentaire de test)',
      },
    });

    await prisma.productLike.create({
      data: {
        productId: riz.id,
        userId: client.id,
        type: 'LIKE',
      },
    });

    await prisma.product.update({
      where: { id: riz.id },
      data: { likesCount: 1, commentsCount: 1 },
    });

    await prisma.notification.create({
      data: {
        userId: merchant.id,
        type: 'ORDER',
        message: 'Nouvelle commande de test (Fatou Sarr)',
        resourceId: order.id,
        resourceType: 'Order',
      },
    });

    await prisma.message.create({
      data: {
        senderId: client.id,
        receiverId: merchant.id,
        content: 'Bonjour, le riz 5kg est-il encore disponible ?',
      },
    });

    await prisma.subscription.create({
      data: {
        followerId: client.id,
        followingId: merchant.id,
      },
    });

    await prisma.service.create({
      data: {
        name: 'Livraison Dakar',
        description: 'Livraison de test dans Dakar',
        price: 1500,
        providerId: supplier.id,
      },
    });

    console.log('Seed de test terminé.');
    console.log('');
    console.log(`Comptes (mot de passe: ${TEST_PASSWORD})`);
    console.log(`  SUPER_ADMIN  ${superAdmin.phoneNumber}  ${superAdmin.email}`);
    console.log(`  ADMIN        ${admin.phoneNumber}  ${admin.email}`);
    console.log(`  MODERATOR    ${moderator.phoneNumber}  ${moderator.email}`);
    console.log(`  MERCHANT     ${merchant.phoneNumber}  ${merchant.email}`);
    console.log(`  SUPPLIER     ${supplier.phoneNumber}  ${supplier.email}`);
    console.log(`  CLIENT       ${client.phoneNumber}  ${client.email}`);
    console.log('');
    console.log(`Boutique #${shop.id} — ${shop.name}`);
    console.log(`Produits publiés: ${riz.name}, ${boubou.name}`);
    console.log(`Panier client #${cart.id} | Commande #${order.id}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
