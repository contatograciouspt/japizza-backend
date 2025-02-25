// zoneSoftController.js
const axios = require("axios")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const Order = require("../models/Order")
const Menu = require("../models/Menu")
const Product = require("../models/Product")

// Recupera as variáveis de ambiente
// const clientId = process.env.ZONESOFT_CLIENT_ID
const clientId = process.env.ZS_SANDBOX_APP_CLIENT_ID
// const appKey = process.env.ZONESOFT_APP_KEY
const appKey = process.env.ZS_SANDBOX_APP_KEY
const secretKey = process.env.ZS_SANDBOX_APP_SECRET
// const secretKey = process.env.ZONESOFT_APP_SECRET
const appName = "Japizza"
const apiUrlOrder = "https://zsroi.zonesoft.org/v1.0/integration/order"

// Função para gerar a assinatura HMAC
function generateHmacSignature(body, secret) {
    return crypto.createHmac("sha256", secret).update(body).digest("hex")
}

/**
 * Endpoint de login que gera um token JWT e, opcionalmente, dispara a sincronização do menu.
 */
const zoneSoftLogin = async (req, res) => {
    try {
        const data = req.body
        console.log(data)
        if (data.app_store_username === appKey && data.app_store_secret === secretKey) {
            const payload = {
                app: appName,
                clientId: clientId,
                timestamp: Date.now()
            }
            const token = jwt.sign(payload, secretKey, { expiresIn: "1h" })
            console.log("Token gerado com sucesso:", token)
            return res.status(200).json({ access_token: token, expires_in: 36000 })
        } else {
            return res.status(401).json({ error: "Credenciais inválidas." })
        }
    } catch (error) {
        console.error("Erro ao fazer login:", error.message)
        res.status(500).json({ error: "Erro ao fazer login", details: error.message })
    }
}

/**
 * Endpoint para sincronização do menu.
 * Espera receber o token via query (ou params) e o repassa para a função interna.
 */
const zoneSoftMenu = async (req, res) => {
    try {
        // O menu deve vir no corpo da requisição (JSON)
        const menuData = req.body
        await Menu.create(menuData)
        console.log("Menu salvo com sucesso!")
        // retornar status 204 conforme documentação da ZoneSoft (sem corpo)
        return res.status(204).end()
    } catch (error) {
        console.error("Erro ao salvar o menu:", error.message)
        res.status(500).json({ error: "Erro ao salvar o menu.", details: error.message })
    }
}

const zoneSoftOrder = async (req, res) => {
    try {
        const orderCode = req.params.orderCode || req.body.orderCode

        if (!orderCode) {
            return res.status(400).json({ error: "OrderCode não fornecido" })
        }

        console.log("orderCode recebido em zoneSoftOrder:", orderCode)

        const order = await Order.findOne({
            orderCode: orderCode,
            status: "Pago"
        })

        if (!order) {
            return res.status(404).json({ error: "Order não encontrada ou não paga." })
        }

        const orderData = JSON.parse(JSON.stringify(order))
        const orderItem = orderData.cart[0]
        const extra = orderItem.extras
        console.log("Extra:", extra)

        if (!orderItem?.zoneSoftId) {
            throw new Error("ZoneSoftId não encontrado no item do pedido")
        }

        const menuDoc = await Menu.findOne({}, {}, { sort: { createdAt: -1 } })
        const menuProduct = menuDoc.products.find(p => String(p.id) === String(orderItem.zoneSoftId))

        if (!menuProduct) {
            throw new Error(`Produto com zoneSoftId ${orderItem.zoneSoftId} não encontrado no menu`)
        }

        const attributes = {
            quantity: orderItem.quantity || 1,
            // price: Number(menuProduct.price),
            price: 0,
            discount: 0,
            name: extra,
            id: orderItem.zoneSoftId
        }

        const productItem = {
            quantity: orderItem.quantity || 1,
            price: Math.round(Number(orderItem.price) * 100), // converte para centavos
            discount: orderItem.variant?.discount || 0,
            name: menuProduct.name,
            id: menuProduct.id,
            attributes: attributes
        }

        const zonesoftOrderData = {
            order_id: order.orderCode.toString(),
            store_id: clientId,
            type_order: orderData.shippingOption === "shipping" ? "DELIVERY" : "PICKUP",
            order_time: new Date(order.createdAt).toISOString().slice(0, 19).replace("T", " "),
            estimated_pickup_time: new Date(new Date(order.createdAt).getTime() + 30 * 60000).toISOString().slice(0, 19).replace("T", " "),
            currency: "EUR",
            delivery_fee: Math.round(Number(orderData.frete) * 100) || 0,
            courier: {
                name: "",
                phone_number: "",
                license_plate: ""
            },
            customer: {
                name: orderData.user_info?.name || "",
                phone: orderData.user_info?.contact || "",
                nif: orderData.user_info?.nif || "",
                email: orderData.user_info?.email || ""
            },
            products: [productItem],
            obs: orderData.user_info?.additionalInformation || "",
            orderIsAlreadyPaid: true,
            payment_type: orderData.payment_type || 1,
            delivery_address: {
                label: orderData.user_info?.address || "",
                latitude: orderData.localizacao || "",
                longitude: orderData.localizacao || ""
            },
            is_picked_up_by_customer: orderData.frete,
            discounted_products_total: 0,
            total_customer_to_pay: Math.round(Number(orderData.amount) * 100) || 0,
            payment_charges: {
                total: Number(orderData.amount) || 0,
                sub_total: Math.round(Number(orderData.amount) * 100) || 0,
                tax: 0,
                total_fee: 0,
                total_fee_tax: 0,
                bag_fee: 0,
                delivery_fee: Math.round(Number(orderData.frete) * 100) || 0,
                delivery_fee_tax: 0,
                small_order_fee: 0,
                small_order_fee_tax: 0,
                pick_and_pack_fee: 0,
                pick_and_pack_fee_tax: 0,
                tip: 0
            }
        }

        console.log("Pedido pronto para ZoneSoft:", zonesoftOrderData)

        const body = JSON.stringify(zonesoftOrderData)
        const signature = generateHmacSignature(body, secretKey)

        const response = await axios.post(apiUrlOrder, body, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": appKey,
                "X-Integration-Signature": signature
            }
        })

        return res.status(204).json(response.data)

    } catch (error) {
        console.error("Erro ao enviar pedido:", error.response ? error.response.data : error.message)
        return res.status(500).json({
            error: "Erro ao enviar o pedido para ZoneSoft",
            details: error.message
        })
    }
}

const zoneSoftOrderStatus = (req, res) => {
    console.log("Recebido pedido de status:", req.params, req.body)
    return res.status(204).end()
}

const zoneSoftPosStatus = (req, res) => {
    console.log("GET /pos/status recebido:", req.params, req.body)
    return res.status(204).end()
}

// Coloca o POS online para receber encomendas (DELETE /pos/status/closing)
const zoneSoftPosOnline = (req, res) => {
    console.log("DELETE /pos/status/closing: ", req.params, req.body)
    return res.status(204).end()
}

// Coloca o POS offline para não receber encomendas (PUT /pos/status/closing)
const zoneSoftPosOffline = (req, res) => {
    console.log("PUT /pos/status/closing: ", req.params, req.body)
    return res.status(204).end() // ou res.status(204).end()
}

module.exports = {
    zoneSoftLogin,
    zoneSoftMenu,
    zoneSoftOrder,
    zoneSoftOrderStatus,
    zoneSoftPosOnline,
    zoneSoftPosStatus,
    zoneSoftPosOffline
}