import accounting from "accounting-js";
/* eslint camelcase: 0 */
// meteor modules
import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
// reaction modules
import { Packages } from "/lib/collections";
import { Reaction, Logger } from "/server/api";
import { RazorpayApi } from "./razorpayapi";

function luhnValid(x) {
  return [...x].reverse().reduce((sum, c, i) => {
    let d = parseInt(c, 10);
    if (i % 2 !== 0) { d *= 2; }
    if (d > 9) { d -= 9; }
    return sum + d;
  }, 0) % 10 === 0;
}

const ValidCardNumber = Match.Where(function (x) {
  return /^[0-9]{13,16}$/.test(x) && luhnValid(x);
});

const ValidExpireMonth = Match.Where(function (x) {
  return /^[0-9]{1,2}$/.test(x);
});

const ValidExpireYear = Match.Where(function (x) {
  return /^[0-9]{4}$/.test(x);
});

const ValidCVV = Match.Where(function (x) {
  return /^[0-9]{3,4}$/.test(x);
});

function parseCardData(data) {
  return {
    number: data.number,
    name: data.name,
    cvc: data.cvv2,
    exp_month: data.expire_month,
    exp_year: data.expire_year
  };
}

// Razorpay uses a "Decimal-less" format so 10.00 becomes 1000
function formatForRazorpay(amount) {
  return Math.round(amount * 100);
}

function unformatFromRazorpay(amount) {
  return (amount / 100);
}

export function getApiKey() {
  const settings = Packages.findOne({
    name: "reaction-razorpay",
    shopId: Reaction.getShopId()
  }).settings;
  if (!settings.api_key) {
    throw new Meteor.Error("403", "Invalid Razorpay Credentials");
  }
  return settings.api_key;
}

export function getApiSecret() {
  const settings = Packages.findOne({
    name: "reaction-razorpay",
    shopId: Reaction.getShopId()
  }).settings;
  if (!settings.api_secret) {
    throw new Meteor.Error("403", "Invalid Razorpay Credentials");
  }
  return settings.api_secret;
}

function razorpayCaptureCharge(authorizationId, amount) {
  let result;
  try {
    const apiKey = getApiKey();
    const apiSecret = getApiSecret();
    const captureResult = RazorpayApi.methods.captureCharge.call({
      authorizationId,
      amount,
      apiKey,
      apiSecret
    });
    if (captureResult.status === "captured") {
      result = {
        saved: true,
        response: captureResult
      };
    } else {
      result = {
        saved: false,
        response: captureResult
      };
    }
  } catch (error) {
    Logger.error(error);
    result = {
      saved: false,
      error: error
    };
    return { error, result };
  }
  return result;
}


Meteor.methods({
  /**
   * Return the settings for the Razorpay payment Method
   * @return {Object} Express Checkout settings
   */
  "getRazorpayCheckoutSettings": function () {
  const settings = Packages.findOne({
    name: "reaction-razorpay",
    shopId: Reaction.getShopId()
  }).settings;
  if (!settings.api_key) {
    throw new Meteor.Error("403", "Invalid Razorpay Credentials");
  }
  return settings.api_key;
  },

  /**
   * Capture a Razorpay charge
   * @see https://docs.razorpay.com/docs/v1paymentsidcapture
   * @param  {Object} paymentMethod A PaymentMethod object
   * @return {Object} results from Razorpay normalized
   */
  "razorpay/payment/capture": function (paymentData) {
    check(paymentData, Reaction.Schemas.PaymentMethod);
    let captureResult;
    const authorizationId = paymentData.transactionId;
    const amount = formatForRazorpay(paymentData.amount);
    captureResult = razorpayCaptureCharge(authorizationId, amount);

    return captureResult;
  },

  /**
   * Issue a refund against a previously captured transaction
   * @see https://docs.razorpay.com/docs/v1paymentsidrefund
   * @param  {Object} paymentMethod object
   * @param  {Number} amount to be refunded
   * @param  {String} reason refund was issued (currently unused by client)
   * @return {Object} result
   */
  "razorpay/refund/create": function (paymentMethod, amount, reason = "requested_by_customer") {
    check(paymentMethod, Reaction.Schemas.PaymentMethod);
    check(amount, Number);
    check(reason, String);

    const refundDetails = {
      charge: paymentMethod.transactionId,
      amount: formatForRazorpay(amount),
      reason
    };
    let result;
    try {
      const apiKey = getApiKey();
      const apiSecret = getApiSecret();
      const refundResult = RazorpayApi.methods.createRefund.call({ refundDetails, apiKey, apiSecret });
      Logger.debug(refundResult);
      if (refundResult && refundResult.entity === "refund") {
        result = {
          saved: true,
          response: refundResult
        };
      } else {
        result = {
          saved: false,
          response: refundResult
        };
        Logger.warn("Razorpay call succeeded but refund not issued");
      }
    } catch (error) {
      Logger.error(error);
      result = {
        saved: false,
        error: `Cannot issue refund: ${error.message}`
      };
      Logger.fatal("Razorpay call failed, refund was not issued");
    }
    return result;
  },

  /**
   * List refunds
   * @see https://docs.razorpay.com/docs/v1paymentspaymentidrefunds
   * @param  {Object} paymentMethod object
   * @return {Object} result
   */
  "razorpay/refund/list": function (paymentMethod) {
    check(paymentMethod, Reaction.Schemas.PaymentMethod);
    let result;
    try {
      const apiKey = getApiKey();
      const apiSecret = getApiSecret();
      const refunds = RazorpayApi.methods.listRefunds.call({ transactionId: paymentMethod.transactionId, apiKey, apiSecret });
      result = [];
      for (const refund of refunds.items) {
        result.push({
          type: refund.entity,
          amount: refund.amount / 100,
          created: (refund.created_at * 1000),
          currency: refund.currency,
          raw: refund
        });
      }
    } catch (error) {
      Logger.error(error);
      result = { error };
    }
    return result;
  }
});
