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

router.get("/pos/status", zoneSoftPosStatus)        // GET p/ ping do POS
router.delete("/pos/status/closing", zoneSoftPosOnline)  // DELETE p/ ficar online
router.put("/pos/status/closing", zoneSoftPosOffline)    // PUT p/ ficar offline

// Endpoint para testar enviar pedido para zoneSoft via POSTMAN
router.post("/test", zoneSoftOrder)


module.exports = router