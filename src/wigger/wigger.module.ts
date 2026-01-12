import { Module } from "@nestjs/common";
import { WiggerService } from "./wigger.service";
import { WiggerController } from "./wigger.controller";

@Module({
  controllers: [WiggerController],
  providers: [WiggerService],
  exports: [WiggerService],
})
export class WiggerModule {}
