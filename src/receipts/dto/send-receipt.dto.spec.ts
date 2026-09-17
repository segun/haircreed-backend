import "reflect-metadata";
import { validate } from "class-validator";
import { ReceiptLineItemDto, SendReceiptDto } from "./send-receipt.dto";

describe("SendReceiptDto", () => {
  const validRequest = (): SendReceiptDto =>
    Object.assign(new SendReceiptDto(), {
      userId: "user-1",
      receiptDate: 1789430400000,
      businessName: "HairCreed",
      businessAddress: "1 Example Street",
      customerId: "customer-1",
      recipientEmail: "b@c.com",
      currency: "GHS",
      lineItems: [
        Object.assign(new ReceiptLineItemDto(), {
          id: "line-1",
          description: "Custom wig fitting",
          quantity: 1,
          amount: 500,
          discount: 0,
        }),
      ],
    });

  it("accepts a delivery email that differs from the customer's email", async () => {
    await expect(validate(validRequest())).resolves.toEqual([]);
  });

  it.each([undefined, "not-an-email"])(
    "rejects invalid recipientEmail %p",
    async (recipientEmail) => {
      const request = validRequest();
      request.recipientEmail = recipientEmail as string;

      const errors = await validate(request);

      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: "recipientEmail" }),
        ]),
      );
    },
  );
});