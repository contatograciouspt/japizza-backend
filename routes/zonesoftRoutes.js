// routes/zonesoftRoutes.js
const express = require("express")
const router = express.Router()
const {
    zoneSoftLogin,
    zoneSoftMenu,
    zoneSoftOrder,
    zoneSoftPosOffline,
    zoneSoftOrderStatus,
    zoneSoftPosOnline, // Renomeado para Online para clareza
    zoneSoftPosStatus // Mantido para Obter Status
} = require("../controller/zonesoftController")

// Rota para o endpoint de login
router.post("/login", zoneSoftLogin)

// Rota para o endpoint de menu (recebe e salva o menu sincronizado)
router.post("/menu", zoneSoftMenu)

// Rota para atualizar o status do pedido
router.post("/order/status", zoneSoftOrderStatus)

// Para LIGAR o POS (online):  Endpoint ajustado para /pos/status/ e método DELETE
router.get("/pos/status/", zoneSoftPosOnline)

// Endpoint para obter o estado do POS (GET)
router.get("/pos/status/", zoneSoftPosStatus)

// Endpoint para colocar o POS online (DELETE)
router.delete("/pos/status/closing", zoneSoftPosOnline)

// Endpoint para colocar o POS offline (PUT)
router.put("/pos/status/closing", zoneSoftPosOffline)

// Endpoint para testar enviar pedido para zoneSoft via POSTMAN
router.post("/test", zoneSoftOrder)


module.exports = router