const express = require("express");
const router = express.Router();
const {
  addOrder,
  getOrderById,
  getOrderCustomer,
  createPaymentIntent,
  addRazorpayOrder,
  createOrderByRazorPay,
} = require("../controller/customerOrderController");

//add a order
router.post("/add", addOrder);

// create stripe payment intent
router.post("/create-payment-intent", createPaymentIntent);

//add razorpay order
router.post("/add/razorpay", addRazorpayOrder);

//add a order by razorpay
router.post("/create/razorpay", createOrderByRazorPay);

//get a order by id
router.get("/:id", getOrderById);

//get all order by a user
router.get("/", getOrderCustomer);

module.exports = router;
