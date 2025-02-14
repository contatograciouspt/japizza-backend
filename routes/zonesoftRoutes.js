const express = require("express");
const router = express.Router();
const {
    zoneSoftLogin,
    zoneSoftMenu,
    zoneSoftOrderStatus,
    zoneSoftPos
} = require("../controller/zonesoftController");

// Rota para o endpoint de login
router.post("/login", zoneSoftLogin);

// Rota para o endpoint de menu (recebe e salva o menu sincronizado)
router.post("/menu", zoneSoftMenu);

// Rota para atualizar o status do pedido
router.post("/order/status", zoneSoftOrderStatus);

// Para ligar o POS:
router.delete("/pos/status/closing", zoneSoftPos);

// Para desligar o POS:
router.put("/pos/status/closing", zoneSoftPos);

module.exports = router;