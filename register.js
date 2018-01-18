/* eslint camelcase: 0 */
import { Reaction } from "/server/api";

Reaction.registerPackage({
  label: "RazorPay",
  name: "reaction-razorpay",
  icon: "fa fa-credit-card",
  autoEnable: true,
  settings: {
    "mode": false,
    "api_key": "",
    "api_secret": "",
    "reaction-razorpay": {
      enabled: false,
      support: [
        "Authorize",
        "Capture",
        "Refund"
      ]
    }
  },
  registry: [
    // Settings panel
    {
      label: "RazorPay",
      provides: "paymentSettings",
      container: "dashboard",
      template: "razorpaySettings"
    },

    // Payment form for checkout
    {
      template: "razorpayPaymentForm",
      provides: "paymentMethod",
      icon: "fa fa-credit-card"
    }
  ]
});
