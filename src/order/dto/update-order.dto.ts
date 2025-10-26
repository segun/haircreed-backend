
import { Orders } from "src/types";

export class UpdateOrderDto {
  updates: Partial<Orders>;
  userId: string;
}
