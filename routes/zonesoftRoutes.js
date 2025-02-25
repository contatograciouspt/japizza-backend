// routes/zonesoftRoutes.js
const express = require("express")
const router = express.Router()
const {
    zoneSoftLogin,
    zoneSoftMenu,
    zoneSoftOrder,
    zoneSoftPosOffline,
    zoneSoftOrderStatus,
    zoneSoftPosOnline,
    zoneSoftPosStatus
} = require("../controller/zonesoftController")

// Rota para o endpoint de login
router.post("/login", zoneSoftLogin)

// Rota para o endpoint de menu (recebe e salva o menu sincronizado)
router.post("/menu", zoneSoftMenu)

// Rota para atualizar o status do pedido
router.post("/order/status", zoneSoftOrderStatus)

// Rota para obter o status do POS
router.get("/pos/status", zoneSoftPosStatus)
router.post("/pos/status", zoneSoftPosStatus)
router.delete("/pos/status", zoneSoftPosStatus)
router.put("/pos/status", zoneSoftPosStatus)

// Rota para colocar o POS online
router.delete("/pos/status/closing", zoneSoftPosOnline)

// Rota para colocar o POS offline
router.put("/pos/status/closing", zoneSoftPosOffline)

// Endpoint para testar enviar pedido para zoneSoft via POSTMAN
router.post("/ordercode", zoneSoftOrder)


module.exports = router