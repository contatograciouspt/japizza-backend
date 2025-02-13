const express = require("express");
const router = express.Router();
const {
    zoneSoftLogin,
    zoneSoftMenu,
    zoneSoftOrderStatus,
    zoneSoftOrder,
    zoneSoftPos
} = require("../controller/zonesoftController");

// Rota para o endpoint de login
router.post("/login", zoneSoftLogin);

// Rota para o endpoint de menu (recebe e salva o menu sincronizado)
router.post("/menu", zoneSoftMenu);

// Rota para atualizar o status do pedido
router.post("/order/status", zoneSoftOrderStatus);
router.post("/order", zoneSoftOrder);

// Rota para o endpoint de POS (confirmação de recebimento/status do POS)
router.post("/pos", zoneSoftPos);

module.exports = router;
