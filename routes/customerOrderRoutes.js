const express = require("express");
const router = express.Router();
const {
  addOrder,
  getOrderById,
  getOrderCustomer,
  createPaymentIntent,
  createCheckoutSession
} = require("../controller/customerOrderController");

//add a order
router.post("/add", addOrder);

// create stripe payment intent
// router.post("/create-payment-intent", createPaymentIntent);

// create stripe checkout session
// router.post("/create-checkout-session", createCheckoutSession);

//get a order by id
router.get("/:id", getOrderById);

//get all order by a user
router.get("/", getOrderCustomer);

module.exports = router;
