// zoneSoftRoutes.js
const express = require("express");
const router = express.Router();
const {
    zoneSoftLogin,
    zoneSoftMenu,
    zoneSoftOrder,
    zoneSoftPos
} = require("../controller/zonesoftController"); // Importe as funções do controller

// Rota para o endpoint de login
router.post("/login", zoneSoftLogin);

// Rota para o endpoint de menu
router.get("/menu", zoneSoftMenu);

// Rota para enviar pedido usando orderCode
router.post("/order/:orderCode", zoneSoftOrder);

// Rota para o endpoint de order (recebimento de pedidos)
router.post("/order", zoneSoftOrder);

// Rota para o endpoint de POS (confirmação de recebimento)
router.post("/pos", zoneSoftPos);

module.exports = router;