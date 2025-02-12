// zoneSoftController.js
const axios = require("axios")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const Product = require("../models/Product")
const Order = require("../models/Order")
const Menu = require("../models/Menu")

// Recupera as variáveis de ambiente
const clientId = process.env.ZONESOFT_CLIENT_ID
const appKey = process.env.ZONESOFT_APP_KEY
const secretKey = process.env.ZONESOFT_APP_SECRET
const appName = "Japizza"
const apiUrlOrder = "https://zsroi.zonesoft.org/v1.0/integration/order"


// Função para gerar a assinatura HMAC
function generateHmacSignature(body, secret) {
    return crypto.createHmac("sha256", secret).update(body).digest("hex")
}

/**
 * Endpoint para sincronização do menu.
 * Espera receber o token via query (ou params) e o repassa para a função interna.
 */
const zoneSoftMenu = async (req, res) => {
    try {
        // O menu deve vir no corpo da requisição (JSON)
        const menuData = req.body
        if (!menuData || !menuData.families) {
            return res.status(400).json({ error: "Dados do menu inválidos ou incompletos." })
        }

        // Salva o menu recebido no banco de dados (pode ser feito como novo documento ou atualização, conforme sua lógica)
        // Exemplo: cria um novo registro (você pode implementar lógica para atualizar o menu existente se necessário)
        const menuSaved = await Menu.create(menuData)
        console.log("Menu salvo com sucesso:", menuSaved)
        res.status(200).json({ message: "Menu sincronizado e salvo com sucesso.", menu: menuSaved })
    } catch (error) {
        console.error("Erro ao salvar o menu:", error.message)
        res.status(500).json({ error: "Erro ao salvar o menu.", details: error.message })
    }
}

/**
 * Endpoint para envio de pedidos para a ZoneSoft.
 * (Lógica inalterada do seu código original.)
 */
const zoneSoftOrder = async (req, res) => {
    try {
        const { orderCode } = req.params
        console.log("orderCode para enviar pedido para ZoneSoft:", orderCode)
        const order = await Order.findOne({ orderCode: orderCode, status: "Pago" })
        if (!order) {
            return res.status(404).json({ error: "Order não encontrado ou não foi pago" })
        }
        console.log("Order encontrado:", order.orderCode)
        const cartInfo = order.cart[0] || {}
        const customerInfo = cartInfo.user_info || {}

        const productItems = (cartInfo.cart || []).map(item => {
            const price = Number(item.price)
            const productID = order._id || {}
            return {
                quantity: item.quantity,
                price: Math.round(price * 100),
                discount: item.prices.discount || 0,
                name: item.title,
                id: productID,
                attributes: []
            }
        })

        const zonesoftOrderData = {
            order_id: order.orderCode.toString(),
            store_id: clientId,
            type_order: cartInfo.shippingOption === "shipping" ? "DELIVERY" : "PICKUP",
            order_time: new Date(order.createdAt).toISOString().slice(0, 19).replace("T", " "),
            estimated_pickup_time: new Date(new Date(order.createdAt).getTime() + 30 * 60000)
                .toISOString().slice(0, 19).replace("T", " "),
            currency: "EUR",
            delivery_fee: Math.round((cartInfo.shippingCost || 0) * 100),
            customer: {
                name: customerInfo.name,
                phone: customerInfo.contact,
                nif: customerInfo.nif || "",
                email: customerInfo.email
            },
            products: productItems,
            obs: order.customerTrns ? order.customerTrns.join(" ") : "",
            orderIsAlreadyPaid: true,
            payment_type: 1,
            delivery_address: {
                label: customerInfo.address,
                latitude: "",
                longitude: ""
            },
            is_picked_up_by_customer: cartInfo.shippingOption !== "shipping",
            discounted_products_total: 0,
            total_customer_to_pay: Math.round(order.amount),
            payment_charges: {
                total: Math.round(order.amount),
                sub_total: Math.round((cartInfo.subTotal || 0) * 100),
                tax: 0,
                total_fee: 0,
                total_fee_tax: 0,
                bag_fee: 0,
                delivery_fee: Math.round((cartInfo.shippingCost || 0) * 100),
                delivery_fee_tax: 0,
                small_order_fee: 0,
                small_order_fee_tax: 0,
                pick_and_pack_fee: 0,
                pick_and_pack_fee_tax: 0,
                tip: 0
            }
        }

        const body = JSON.stringify(zonesoftOrderData)
        const signature = generateHmacSignature(body, secretKey)
        console.log("Enviando pedido para ZoneSoft...")
        console.log("Assinatura HMAC:", signature)

        const response = await axios.post(apiUrlOrder, body, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": appKey,
                "X-Integration-Signature": signature
            }
        })

        console.log("Resposta da API de pedido:", response.data)
        res.status(200).json(response.data)
    } catch (error) {
        console.error("Erro ao enviar o pedido:", error.response ? error.response.data : error.message)
        res.status(500).json({ error: "Erro ao enviar o pedido", details: { message: error.message } })
    }
}

/**
 * Endpoint de login que gera um token JWT e, opcionalmente, dispara a sincronização do menu.
 */
const zoneSoftLogin = async (req, res) => {
    try {
        const data = req.body
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

const zoneSoftPos = async (req, res) => {
    try {
        const posData = req.body
        console.log("Dados de POS recebidos: ", posData)
        res.status(200).json({ message: "Confirmação de recebimento recebida com sucesso." })
    } catch (error) {
        console.error("Erro ao receber confirmação de recebimento:", error)
        res.status(500).json({ error: "Erro ao receber confirmação de recebimento." })
    }
}

module.exports = {
    zoneSoftLogin,
    zoneSoftMenu,
    zoneSoftOrder,
    zoneSoftPos
}
