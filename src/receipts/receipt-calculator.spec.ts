import { UnprocessableEntityException } from "@nestjs/common";
import { ReceiptCalculator } from "./receipt-calculator";

describe("ReceiptCalculator", () => {
  const calculator = new ReceiptCalculator();

  it("calculates decimal amounts without binary floating-point drift", () => {
    const result = calculator.calculate([
      {
        id: "line-1",
        description: "Service",
        quantity: 1,
        amount: 0.1,
        discount: 0,
      },
      {
        id: "line-2",
        description: "Product",
        quantity: 1,
        amount: 0.2,
        discount: 0,
      },
    ]);

    expect(result.totalAmount).toBe(0.3);
    expect(result.lineTotals).toEqual([0.1, 0.2]);
  });

  it("allows a discount equal to the gross line amount", () => {
    const result = calculator.calculate([
      {
        id: "line-1",
        description: "Service",
        quantity: 2,
        amount: 25,
        discount: 50,
      },
    ]);

    expect(result.totalAmount).toBe(0);
  });

  it("rejects a discount greater than the gross line amount", () => {
    expect(() =>
      calculator.calculate([
        {
          id: "line-1",
          description: "Service",
          quantity: 2,
          amount: 25,
          discount: 50.01,
        },
      ]),
    ).toThrow(UnprocessableEntityException);
  });
});
