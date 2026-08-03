import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { OrderStatus } from '../../orders/interfaces/order.interface.js';
import type { AnalyticsRepository } from '../interfaces/analytics-repository.interface.js';
import type { DashboardRecord } from '../interfaces/dashboard.interface.js';

const sellingStatuses: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

@Injectable()
export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(since: Date): Promise<DashboardRecord> {
    const [
      revenue,
      ordersInPeriod,
      customersTotal,
      newCustomersInPeriod,
      statusRows,
      sellers,
      recent,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { createdAt: { gte: since }, paymentStatus: 'PAID' },
        _sum: { totalPiasters: true },
      }),
      this.prisma.order.count({ where: { createdAt: { gte: since } } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: since } } }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId', 'productName', 'productSlug', 'imageUrl'],
        where: { order: { createdAt: { gte: since }, status: { in: sellingStatuses } } },
        _sum: { quantity: true, lineTotalPiasters: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          orderNumber: true,
          customerFirstName: true,
          customerLastName: true,
          status: true,
          paymentStatus: true,
          totalPiasters: true,
          placedAt: true,
        },
      }),
    ]);

    return {
      revenuePiasters: revenue._sum.totalPiasters ?? 0,
      ordersInPeriod,
      customersTotal,
      newCustomersInPeriod,
      statusCounts: Object.fromEntries(statusRows.map((row) => [row.status, row._count._all])),
      bestSellers: sellers.map((seller) => ({
        productId: seller.productId,
        productName: seller.productName,
        productSlug: seller.productSlug,
        imageUrl: seller.imageUrl,
        quantitySold: seller._sum.quantity ?? 0,
        revenuePiasters: seller._sum.lineTotalPiasters ?? 0,
      })),
      recentOrders: recent.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: `${order.customerFirstName} ${order.customerLastName}`,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalPiasters: order.totalPiasters,
        placedAt: order.placedAt,
      })),
    };
  }
}
