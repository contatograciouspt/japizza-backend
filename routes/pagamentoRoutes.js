require("dotenv").config();
const express = require("express");
const router = express.Router();
const { webhookEvents, webhookConnection } = require("../controller/webhookController");
const { createPaymentOrder, getCustomAllOrders, savecashOnDelivery } = require("../controller/pagamentoController");

// Rota para verificação do webhook
router.post("/connection", webhookConnection)

// Rota para receber notificações de eventos
router.post("/events", webhookEvents)

// Endpoint para conexão e ordem de pagamento com viva wallet
router.post("/payment",  createPaymentOrder)

// Endpoint para salvar pedidos para pagamento na entrega
router.post("/cashondelivery", savecashOnDelivery)

// Endpoint para buscar os pagamentos salvos
router.get("/getallorders", getCustomAllOrders)


module.exports = router;