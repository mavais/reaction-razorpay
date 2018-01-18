import { Template } from "meteor/templating";
import { AutoForm } from "meteor/aldeed:autoform";
import { Reaction, i18next } from "/client/api";
import { Packages } from "/lib/collections";
import { RazorpayPackageConfig } from "../../lib/collections/schemas";

import "./razorpay.html";

Template.razorpaySettings.helpers({
  RazorpayPackageConfig() {
    return RazorpayPackageConfig;
  },
  packageData() {
    return Packages.findOne({
      name: "reaction-razorpay",
      shopId: Reaction.getShopId()
    });
  }
});

Template.razorpay.helpers({
  packageData() {
    return Packages.findOne({
      name: "reaction-razorpay",
      shopId: Reaction.getShopId()
    });
  }
});

Template.razorpay.events({
  "click [data-event-action=showRazorpaySettings]"() {
    Reaction.showActionView();
  }
});

AutoForm.hooks({
  "razorpay-update-form": {
    onSuccess: function () {
      return Alerts.toast(i18next.t("admin.settings.saveSuccess"), "success");
    },
    onError: function (error) {
      return Alerts.toast(`${i18next.t("admin.settings.saveFailed")} ${error}`, "error");
    }
  }
});
