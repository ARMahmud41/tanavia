const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    // Get a real shift + product + variant to test with
    const shift = await p.shift.findFirst();
    const product = await p.product.findFirst({
      where: { active: true },
      include: { variants: true }
    });
    const variant = product.variants[0];
    const user = await p.user.findFirst({ where: { role: 'STAFF' } });

    console.log('Testing with:');
    console.log('  shiftId:', shift ? shift.id : 'NONE');
    console.log('  productId:', product.id);
    console.log('  variantId:', variant.id);
    console.log('  actorId:', user ? user.id : 'NONE');
    console.log('---');

    // Try the exact same shape as placeOfflineOrder with Unchecked input
    const orderData = {
      orderNumber: 'TEST-UNCHK-' + Date.now(),
      channel: 'OFFLINE',
      shiftId: shift ? shift.id : null,
      status: 'DELIVERED',
      customerName: 'Walk-in Customer',
      customerPhone: null,
      note: null,
      subtotal: 1600,
      discount: 0,
      deliveryFee: 0,
      total: 1600,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      items: {
        create: [{
          productId: product.id,
          name: product.name,
          size: variant.size,
          color: variant.color,
          qty: 1,
          price: 1600,
          cost: 500,
        }],
      },
      events: {
        create: [
          { status: 'PLACED', note: 'Offline sale', actor: user ? user.id : 'system' },
          { status: 'DELIVERED', note: 'Completed at counter', actor: user ? user.id : 'system' },
        ],
      },
    };

    console.log('Sending data:', JSON.stringify(orderData, null, 2));
    console.log('---');

    const order = await p.order.create({ data: orderData });
    console.log('✅ SUCCESS:', order.id);
  } catch (e) {
    console.log('❌ ERROR TYPE:', e.constructor.name);
    console.log('❌ ERROR MESSAGE:');
    console.log(e.message);
  } finally {
    await p.$disconnect();
  }
})();
