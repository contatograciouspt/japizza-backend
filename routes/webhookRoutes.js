// webhookRoutes.js
const express = require("express");
const router = express.Router();
const {
    webhookPaymentCreated,
    webhookPaymentReversed,
    webhookPaymentFailed,
    webhookConnection
} = require("../controller/webhookController");

// Rota para verificação do webhook
router.get("/events", webhookConnection)

// Rotas para receber notificações de eventos específicos
router.post("/events/payment-created", webhookPaymentCreated)
router.post("/events/payment-reversed", webhookPaymentReversed)
router.post("/events/payment-failed", webhookPaymentFailed)

module.exports = router;