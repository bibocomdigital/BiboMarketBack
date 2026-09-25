import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { JwtTokenModule } from './infrastructure/auth/jwt.module';
import { CategorieShopModule } from './interface/modules/categorie-shop.module';
import { CategorieProdModule } from './interface/modules/categorie-prod.module';
import { AuthModule } from './interface/modules/auth.module';
import { UserModule } from './interface/modules/user.module';
import { ShopModule } from './interface/modules/shop.module';
import { ProductModule } from './interface/modules/product.module';
import { CartModule } from './interface/modules/cart.module';
import { OrderModule } from './interface/modules/order.module';
import { CommentLikeModule } from './interface/modules/comment-like.module';
import { SubscriptionModule } from './interface/modules/subscription.module';
import { NotificationModule } from './interface/modules/notification.module';
import { MessageModule } from './interface/modules/message.module';
import { RealtimeModule } from './interface/modules/realtime.module';
import { AdminModule } from './interface/modules/admin.module';
import { BadgeModule } from './interface/modules/badge.module';
import { PlatformModule } from './interface/modules/platform.module';

@Module({
  imports: [
    PrismaModule,
    JwtTokenModule,
    RealtimeModule,
    CategorieShopModule,
    CategorieProdModule,
    AuthModule,
    SubscriptionModule,
    UserModule,
    ShopModule,
    ProductModule,
    CartModule,
    OrderModule,
    CommentLikeModule,
    NotificationModule,
    MessageModule,
    AdminModule,
    BadgeModule,
    PlatformModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
