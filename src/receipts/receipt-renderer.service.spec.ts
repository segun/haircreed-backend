import { BadGatewayException } from "@nestjs/common";
import {
  ReceiptRendererService,
  RenderReceiptPayload,
} from "./receipt-renderer.service";

describe("ReceiptRendererService", () => {
  const renderer = new ReceiptRendererService();
  const payload: RenderReceiptPayload = {
    receiptNumber: 23,
    receiptDate: 1789430400000,
    businessName: "HairCreed",
    businessAddress: "1 Example Street\nAccra",
    customerName: "Ada Lovelace",
    customerEmail: "ada@example.com",
    customerPhone: "+233000000000",
    currency: "GHS ",
    lineItems: [
      {
        id: "line-1",
        description: "Custom wig fitting",
        quantity: 1,
        amount: 500,
        discount: 25,
      },
    ],
    lineTotals: [475],
    totalAmount: 475,
    renderTimestamp: 1789430400000,
  };

  it("renders a deterministic PDF for the same delivery attempt", async () => {
    const first = await renderer.render(payload);
    const second = await renderer.render(payload);

    expect(first.subarray(0, 4).toString()).toBe("%PDF");
    expect(second.equals(first)).toBe(true);
  });

  it("rejects a logo that is not a supported data URL", async () => {
    await expect(
      renderer.render({
        ...payload,
        businessLogo: "https://example.com/logo.png",
      }),
    ).rejects.toThrow(BadGatewayException);
  });
});
