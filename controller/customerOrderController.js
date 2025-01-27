require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Setting = require("../models/Setting");

const { handleProductQuantity } = require("../lib/stock-controller/others");
const { formatAmountForStripe } = require("../lib/stripe/stripe");

const addOrder = async (req, res) => {
  // console.log("addOrder", req.body);
  try {
    const newOrder = new Order({
      ...req.body,
      user: req.user._id,
    });
    const order = await newOrder.save();
    res.status(201).send(order);
    handleProductQuantity(order.cart);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

//create payment intent for stripe
const createPaymentIntent = async (req, res) => {
  console.log("Criar Payment Intent: ", req.body);

  const { metadata } = req.body;

  try {
    const payment_intent = await stripe.paymentIntents.create({
      amount: metadata.totalAmount,
      currency: "eur",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log("payment_intent", payment_intent);

    res.send(payment_intent);
  } catch (err) {
    console.error("Erro ao criar payment intent:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    res.status(500).send({ message: errorMessage });
  }
};


const createCheckoutSession = async (req, res) => {
  console.log("Dados para checkout session: ", req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { line_items, mode, success_url, cancel_url, customer_email, metadata } = req.body;

  try {
    const stripeInstance = new stripe(stripeSecret);

    const params = { line_items, mode, success_url, cancel_url, customer_email, metadata };
    console.log("Params antes da criação da sessão", params);

    const session = await stripeInstance.checkout.sessions.create(params);
    console.log("session gerada: ", session);

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Erro ao criar sessão do stripe:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    res.status(500).send({ message: errorMessage });
  }
};

// get all orders user
const getOrderCustomer = async (req, res) => {
  try {
    // console.log("getOrderCustomer");
    const { page, limit } = req.query;

    const pages = Number(page) || 1;
    const limits = Number(limit) || 8;
    const skip = (pages - 1) * limits;

    const totalDoc = await Order.countDocuments({ user: req.user._id });

    // total padding order count
    const totalPendingOrder = await Order.aggregate([
      {
        $match: {
          status: "Pending",
          user: mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // total padding order count
    const totalProcessingOrder = await Order.aggregate([
      {
        $match: {
          status: "Processing",
          user: mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const totalDeliveredOrder = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
          user: mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    // today order amount

    // query for orders
    const orders = await Order.find({ user: req.user._id })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limits);

    res.send({
      orders,
      limits,
      pages,
      pending: totalPendingOrder.length === 0 ? 0 : totalPendingOrder[0].count,
      processing:
        totalProcessingOrder.length === 0 ? 0 : totalProcessingOrder[0].count,
      delivered:
        totalDeliveredOrder.length === 0 ? 0 : totalDeliveredOrder[0].count,

      totalDoc,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    res.send(order);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addOrder,
  getOrderById,
  getOrderCustomer,
  createPaymentIntent,
  createCheckoutSession
};
