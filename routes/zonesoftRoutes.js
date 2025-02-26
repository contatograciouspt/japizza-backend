// routes/zonesoftRoutes.js
const express = require("express")
const router = express.Router()
const {
    zoneSoftLogin,
    zoneSoftMenu,
    zoneSoftOrder,
    zoneSoftPosOffline,
    zoneSoftPosOnline,
    zoneSoftPosStatus
} = require("../controller/zonesoftController")

// Rota para o endpoint de login
router.post("/login", zoneSoftLogin)

// Rota para o endpoint de menu (recebe e salva o menu sincronizado)
router.post("/menu", zoneSoftMenu)

// Rota para obter o status do POS
router.get("/order/status", zoneSoftPosStatus)

// Rota para colocar o POS online
router.delete("/pos/status", zoneSoftPosOnline)

// Rota para colocar o POS offline
router.put("/pos/status", zoneSoftPosOffline)

// Endpoint para testar enviar pedido para zoneSoft via POSTMAN
router.post("/ordercode", zoneSoftOrder)


module.exports = router