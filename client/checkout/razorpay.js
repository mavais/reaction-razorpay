/* eslint camelcase: 0 */
import { Meteor } from "meteor/meteor";
/* avais */
import { check, Match } from "meteor/check";
/* avais */
import { Template } from "meteor/templating";
import { AutoForm } from "meteor/aldeed:autoform";
import { $ } from "meteor/jquery";
import { getCardType } from "/client/modules/core/helpers/globals";
import { Reaction } from "/client/api";
import { Cart, Shops, Packages } from "/lib/collections";
//import { RazorpayCapture } from "../../lib/api";
import { RazorpayPayment } from "../../lib/collections/schemas";

import "./razorpay.html";

let submitting = false;


//
// local helpers
//
function uiEnd(template, buttonText) {
//  template.$(":input").removeAttr("disabled");
  template.$("#btn-complete-order").text(buttonText);
  return template.$("#btn-processing").addClass("hidden");
}

function paymentAlert(errorMessage) {
  return $(".alert").removeClass("hidden").text(errorMessage);
}

function hidePaymentAlert() {
  return $(".alert").addClass("hidden").text("");
}

function handleRazorpaySubmitError(error) {
  // Match eror on card number. Not submitted to razorpay
  if (error && error.reason && error.reason === "Match failed") {
    const message = "Your card number is invalid. Please check the number and try again";
    return paymentAlert(message);
  }

  // this is a server message with a client-sanitized message
  if (error && error.details) {
    return paymentAlert(error.details);
  }
}

function handleRazorpayPayment(response, amount, template) {
   Meteor.subscribe("Packages");
   let paymentMethod;
   const packageData = Packages.findOne({
      name: "reaction-razorpay",
      shopId: Reaction.getShopId()
      });
   submitting = false;
   const transaction_data = {
      amount: amount * 0.01,
      currency: "INR",
      transactionId: response.razorpay_payment_id
      };
   paymentMethod = {
      processor: "RazorPay",
      paymentPackageId: packageData._id,
      paymentSettingsKey: packageData.registry[0].settingsKey,
      storedCard: "0000",
      method: "credit",
      transactionId: response.razorpay_payment_id,
      currency: "INR",
      amount: amount * 0.01,
      status: "created",
      mode: "authorize",
      createdAt: new Date(),
      transactions: []
      };
   paymentMethod.transactions.push(transaction_data);
   Meteor.call("cart/submitPayment", paymentMethod);
}

// Razorpay uses a "Decimal-less" format so 10.00 becomes 1000
function formatForRazorpay(amount) {
  return Math.round(amount * 100);
}

function getApiKey() {
  const settings = Packages.findOne({
    name: "reaction-razorpay",
    shopId: Reaction.getShopId()
  }).settings;
  if (!settings.api_key) {
    const message = "Invalid Razorpay Credentials";
    return paymentAlert(message);
  }
  return settings.api_key;
}

const chargeObjectSchema = new SimpleSchema({
  amount: { type: Number },
  shopName: { type: String }
});

//
// Template helpers
//

Template.razorpayPaymentForm.helpers({
  RazorpayPayment() {
  $('body').append('<script type="text/javascript" src="https://checkout.razorpay.com/v1/checkout.js">');
    return RazorpayPayment;
  }
});

//
// Template events
//

Template.razorpayPaymentForm.events({     
       'click #rzp-button': function(e){
    const template = this.template;
    const apiKey = getApiKey();
    const total = Cart.findOne().cartTotal();
    const amount = formatForRazorpay(total);
    const name = Shops.findOne().name;
    var options = {
       "key" : apiKey,
       "amount" : amount,
       "name" : name,
       "handler" : function(response){ handleRazorpayPayment(response, amount, template);}    
      };

    var instance = new Razorpay(options);
          instance.open();
          e.preventDefault();
       }
});

//
// autoform handling
//

