import { SimpleSchema } from "meteor/aldeed:simple-schema";
import { PackageConfig } from "/lib/collections/schemas/registry";
/*

 */

export const RazorpayPackageConfig = new SimpleSchema([
  PackageConfig, {
    "settings.mode": {
      type: Boolean,
      defaultValue: false
    },
    "settings.api_key": {
      type: String,
      label: "API Client ID"
    },
    "settings.api_secret": {
      type: String,
      label: "API Secret key"
    },
    "settings.reaction-razorpay.support": {
      type: Array,
      label: "Payment provider supported methods"
    },
    "settings.reaction-razorpay.support.$": {
      type: String,
      allowedValues: ["Authorize", "De-authorize", "Capture", "Refund"]
    }
  }
]);


export const RazorpayPayment = new SimpleSchema({ });

