/* eslint camelcase: 0 */
import _ from "lodash";
import { ValidatedMethod } from "meteor/mdg:validated-method";
import { SimpleSchema } from "meteor/aldeed:simple-schema";
import { Logger } from "/server/api";

export const RazorpayApi = {};
RazorpayApi.methods = {};

export const captureDetailsSchema = new SimpleSchema({
  amount: { type: Number }
});

export const refundDetailsSchema = new SimpleSchema({
  charge: { type: String },
  amount: { type: Number },
  metadata: { type: String, optional: true },
  reason: { type: String }
});

// These are errors on the user side that we just want to pass back up to the user
const expectedErrors = [
  "GATEWAY_ERROR",
  "BAD_REQUEST_ERROR",
  "SERVER_ERROR"
];


RazorpayApi.methods.captureCharge = new ValidatedMethod({
  name: "RazorpayApi.methods.captureCharge",
  validate: new SimpleSchema({
    authorizationId: { type: String },
    amount: {type: Number },
    apiKey: { type: String },
    apiSecret: { type: String }
  }).validator(),
  run({ authorizationId, amount, apiKey, apiSecret })  {
    const Razorpay = require("razorpay");
    const instance = new Razorpay({
	key_id: apiKey,
	key_secret: apiSecret	
	});
    const capturePromise = instance.payments.capture(authorizationId, amount);
    const captureResults = Promise.await(capturePromise);
    return captureResults;
  }
});

RazorpayApi.methods.createRefund = new ValidatedMethod({
  name: "RazorpayApi.methods.createRefund",
  validate: new SimpleSchema({
    refundDetails: { type: refundDetailsSchema },
    apiKey: { type: String },
    apiSecret: { type: String }
  }).validator(),
  run({ refundDetails, apiKey, apiSecret }) {
    const Razorpay = require("razorpay");
    const instance = new Razorpay({
	key_id: apiKey,
	key_secret: apiSecret	
	});
    const payment_id = refundDetails.charge;
    const refundPromise = instance.payments.refund(payment_id , { amount: refundDetails.amount });
    const refundResults = Promise.await(refundPromise);
    return refundResults;
  }
});

RazorpayApi.methods.listRefunds = new ValidatedMethod({
  name: "RazorpayApi.methods.listRefunds",
  validate: new SimpleSchema({
    transactionId: { type: String },
    apiKey: { type: String },
    apiSecret: { type: String }
  }).validator(),
  run({ transactionId, apiKey, apiSecret }) {
    const Razorpay = require("razorpay");
    const instance = new Razorpay({
	key_id: apiKey,
	key_secret: apiSecret	
	});
    const refundListPromise = instance.refunds.all({ payment_id: transactionId });
    const refundListResults = Promise.await(refundListPromise);
    return refundListResults;
  }
});

