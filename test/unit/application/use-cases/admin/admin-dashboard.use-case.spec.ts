import { GetAdminDashboardUseCase } from '@application/use-cases/admin/admin-dashboard.use-case';
import type { AdminRepository } from '@domain/repositories/admin.repository';

function adminRepo(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    countUsers: jest.fn().mockResolvedValue(3),
    groupUsersByRole: jest.fn().mockResolvedValue([
      { role: 'ADMIN', count: 1 },
      { role: 'MERCHANT', count: 1 },
      { role: 'CLIENT', count: 1 },
    ]),
    groupUsersByGender: jest.fn().mockResolvedValue([
      { gender: 'FEMALE', count: 2 },
      { gender: null, count: 1 },
    ]),
    groupUsersByCity: jest.fn().mockResolvedValue([
      { city: 'Dakar', country: 'Sénégal', count: 3 },
    ]),
    findUserCreatedAtSince: jest.fn().mockResolvedValue([{ createdAt: new Date() }]),
    countShops: jest.fn().mockResolvedValue(1),
    countActiveShops: jest.fn().mockResolvedValue(1),
    countVerifiedShops: jest.fn().mockResolvedValue(1),
    countProducts: jest.fn().mockResolvedValue(3),
    groupProductsByStatus: jest.fn().mockResolvedValue([
      { status: 'PUBLISHED', count: 2 },
      { status: 'DRAFT', count: 1 },
    ]),
    countLowStock: jest.fn().mockResolvedValue(1),
    countOrders: jest.fn().mockResolvedValue(2),
    groupOrdersByStatus: jest.fn().mockResolvedValue([
      { status: 'PENDING', count: 1 },
      { status: 'DELIVERED', count: 1 },
    ]),
    groupOrdersByPaymentMethod: jest.fn().mockResolvedValue([
      { paymentMethod: 'CASH_ON_DELIVERY', count: 2 },
    ]),
    findSoldOrdersSince: jest.fn().mockResolvedValue([
      {
        id: 2,
        createdAt: new Date(),
        orderItems: [{ price: 4500, quantity: 2, productId: 1 }],
      },
    ]),
    aggregateSoldRevenue: jest.fn().mockResolvedValue({
      revenue: 9000,
      orderCount: 1,
    }),
    findTopSoldProducts: jest.fn().mockResolvedValue([
      { productId: 1, totalSold: 2, totalRevenue: 9000, orderCount: 1 },
    ]),
    findProductPreviews: jest.fn().mockResolvedValue([
      { id: 1, name: 'Riz parfumé 5kg', price: 4500, imageUrl: 'https://img' },
    ]),
    findRecentOrders: jest.fn().mockResolvedValue([
      {
        id: 2,
        totalAmount: 9000,
        status: 'DELIVERED',
        paymentMethod: 'CASH_ON_DELIVERY',
        createdAt: new Date('2026-09-15T11:00:00.000Z'),
        client: { firstName: 'Fatou', lastName: 'Sarr' },
      },
    ]),
    ...overrides,
  } as unknown as AdminRepository;
}

describe('GetAdminDashboardUseCase', () => {
  it('agrège les KPI plateforme et les graphiques mensuels', async () => {
    const repo = adminRepo();
    const useCase = new GetAdminDashboardUseCase(repo);

    const result = await useCase.execute('12', '10');

    expect(result.currency).toBe('CFA');
    expect(result.periodMonths).toBe(12);
    expect(result.kpis.totalUsers).toBe(3);
    expect(result.kpis.usersByRole).toEqual({
      ADMIN: 1,
      MERCHANT: 1,
      CLIENT: 1,
      SUPPLIER: 0,
    });
    expect(result.kpis.publishedProducts).toBe(2);
    expect(result.kpis.draftProducts).toBe(1);
    expect(result.kpis.totalRevenue).toBe(9000);
    expect(result.kpis.averageOrderValue).toBe(9000);
    expect(result.kpis.deliveryRate).toBe(50);
    expect(result.kpis.paymentMethods.CASH_ON_DELIVERY).toBe(2);
    expect(result.demographics.cities[0]).toEqual({
      city: 'Dakar',
      country: 'Sénégal',
      count: 3,
    });
    expect(result.demographics.genders).toEqual({
      MALE: 0,
      FEMALE: 2,
      OTHER: 0,
      UNKNOWN: 1,
    });
    expect(result.charts.registrations).toHaveLength(12);
    expect(result.charts.revenue).toHaveLength(12);
    expect(result.topProducts[0].productName).toBe('Riz parfumé 5kg');
    expect(result.recentOrders[0].clientName).toBe('Fatou Sarr');
    expect(repo.countLowStock).toHaveBeenCalledWith(10);
  });
});
