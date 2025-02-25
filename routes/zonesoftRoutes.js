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
router.get("/order/status", zoneSoftOrderStatus)
router.post("/order/status", zoneSoftOrderStatus)
router.put("/order/status", zoneSoftOrderStatus)
router.delete("/order/status", zoneSoftOrderStatus)

router.get("/pos/status", zoneSoftPosStatus)
router.post("/pos/status", zoneSoftPosStatus)
router.put("/pos/status", zoneSoftPosStatus)
router.delete("/pos/status", zoneSoftPosStatus)

router.get("/pos/status/closing", zoneSoftPosOffline)
router.post("/pos/status/closing", zoneSoftPosOffline)
router.put("/pos/status/closing", zoneSoftPosOffline)
router.delete("/pos/status/closing", zoneSoftPosOnline)

// Endpoint para testar enviar pedido para zoneSoft via POSTMAN
router.post("/ordercode", zoneSoftOrder)


module.exports = router