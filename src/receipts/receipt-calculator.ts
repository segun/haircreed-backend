import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import Decimal from "decimal.js";
import { ReceiptLineItem } from "../types";

export interface ReceiptCalculation {
  lineTotals: number[];
  totalAmount: number;
}

@Injectable()
export class ReceiptCalculator {
  calculate(lineItems: ReceiptLineItem[]): ReceiptCalculation {
    let total = new Decimal(0);
    const lineTotals = lineItems.map((lineItem, index) => {
      const gross = new Decimal(lineItem.quantity).times(lineItem.amount);
      const discount = new Decimal(lineItem.discount);

      if (discount.greaterThan(gross)) {
        throw new UnprocessableEntityException({
          message: "Receipt line items contain invalid amounts",
          code: "INVALID_LINE_ARITHMETIC",
          fieldErrors: {
            [`lineItems.${index}.discount`]:
              "Discount cannot exceed the gross line amount",
          },
        });
      }

      const lineTotal = gross.minus(discount);
      total = total.plus(lineTotal);
      return lineTotal.toNumber();
    });

    if (!total.isFinite() || total.isNegative()) {
      throw new UnprocessableEntityException({
        message: "Receipt total must be a finite nonnegative amount",
        code: "INVALID_RECEIPT_TOTAL",
        fieldErrors: {},
      });
    }

    return {
      lineTotals,
      totalAmount: total.toNumber(),
    };
  }
}
