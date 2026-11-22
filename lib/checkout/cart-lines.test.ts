import { describe, expect, it } from "vitest";
import { addLine, adjustLine, cartCount, parseCart, removeLine } from "./cart-lines";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("cart lines", () => {
  it("adds, merges and removes", () => {
    let cart = addLine([], A);
    cart = addLine(cart, A);
    cart = addLine(cart, B);
    expect(cart).toEqual([
      { variantId: A, qty: 2 },
      { variantId: B, qty: 1 },
    ]);
    expect(cartCount(cart)).toBe(3);
    expect(removeLine(cart, A)).toEqual([{ variantId: B, qty: 1 }]);
  });

  it("steps quantity up and down within 1..10", () => {
    const cart = [{ variantId: A, qty: 2 }];
    expect(adjustLine(cart, A, 1)[0].qty).toBe(3);
    expect(adjustLine(cart, A, -1)[0].qty).toBe(1);
    expect(adjustLine(adjustLine(cart, A, -1), A, -1)[0].qty).toBe(1);
    expect(adjustLine([{ variantId: A, qty: 10 }], A, 1)[0].qty).toBe(10);
    expect(adjustLine(cart, B, 1)).toEqual(cart);
  });

  it("caps quantity per line", () => {
    let cart = addLine([], A, 9);
    cart = addLine(cart, A, 5);
    expect(cart[0].qty).toBe(10);
  });

  it("treats a tampered or malformed cookie as an empty cart", () => {
    expect(parseCart(undefined)).toEqual([]);
    expect(parseCart("not json")).toEqual([]);
    expect(parseCart(JSON.stringify([{ variantId: "x", qty: 1 }]))).toEqual([]);
    expect(parseCart(JSON.stringify([{ variantId: A, qty: 999 }]))).toEqual([]);
    expect(parseCart(JSON.stringify([{ variantId: A, qty: 2, price: 1 }]))).toEqual([
      { variantId: A, qty: 2 },
    ]);
  });
});
