const express = require("express");
const router = express.Router();
const {
    zoneSoftLogin,
    zoneSoftMenu,
    zoneSoftOrderStatus,
    zoneSoftPosOnline, // Renomeado para Online para clareza
    zoneSoftPosStatus // Mantido para Obter Status
} = require("../controller/zonesoftController");

// Rota para o endpoint de login
router.post("/login", zoneSoftLogin);

// Rota para o endpoint de menu (recebe e salva o menu sincronizado)
router.post("/menu", zoneSoftMenu);

// Rota para atualizar o status do pedido
router.post("/order/status", zoneSoftOrderStatus);

// Para LIGAR o POS (online):  Endpoint ajustado para /pos/status/ e método DELETE
router.delete("/pos/status/", zoneSoftPosOnline);

// Para OBTER o status do POS: Mantido como GET /pos/status/
router.get("/pos/status/", zoneSoftPosStatus);


module.exports = router;