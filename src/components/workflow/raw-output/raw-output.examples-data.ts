/** Exact raw evidence shared by canonical browser and terminal examples. */
export const completeResponse = JSON.stringify(
  {
    ok: false,
    subject: "Checkout fixtures",
    failures: [
      {
        path: "fixtures/checkout/alpha/expected.json",
        field: "deliveryWindow",
        expected: "09:00–17:00",
        actual: null,
      },
      {
        path: "fixtures/checkout/beta/expected.json",
        field: "collectionWindow",
        expected: "10:00–18:00",
        actual: null,
      },
    ],
    checked: 24,
  },
  null,
  2,
);
