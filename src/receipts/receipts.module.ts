import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SuperAdminGuard } from "../auth/super-admin.guard";
import { MailModule } from "../mail/mail.module";
import { ReceiptCalculator } from "./receipt-calculator";
import { ReceiptRendererService } from "./receipt-renderer.service";
import { ReceiptsController } from "./receipts.controller";
import { ReceiptsService } from "./receipts.service";

@Module({
  imports: [AuthModule, MailModule],
  controllers: [ReceiptsController],
  providers: [
    ReceiptsService,
    ReceiptCalculator,
    ReceiptRendererService,
    SuperAdminGuard,
  ],
})
export class ReceiptsModule {}
