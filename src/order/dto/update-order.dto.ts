
import { Orders } from "../../types";

export class UpdateOrderDto {
  updates: Partial<Orders>;
  userId: string;
}
