const express = require("express")
const router = express.Router()
const { webhookEvents, webhookConnection } = require("../controller/webhookController")

// Rota para verificação do webhook
router.get("/events", webhookConnection)

// Rota para receber notificações de eventos
router.post("/events/send", webhookEvents)

module.exports = router