require("dotenv").config()
const express = require("express")
const router = express.Router()
const {
    createPaymentOrder,
    getCustomAllOrders,
    deleteOrderByID,
    updateOrderByID,
    savecashOnDelivery
} = require("../controller/pagamentoController")

// Endpoint para conexão e ordem de pagamento com viva wallet
router.post("/payment", createPaymentOrder)

// Endpoint para salvar pedidos para pagamento na entrega
router.post("/cashondelivery", savecashOnDelivery)

// Endpoint para buscar os pagamentos salvos
router.get("/getallorders", getCustomAllOrders)

// Endpoint para deletar um pedido pelo ID
router.delete("/deleteorder/:id", deleteOrderByID)

// Endpoint para atualizar um pedido pelo ID
router.put("/updateorder/:id", updateOrderByID)


module.exports = router