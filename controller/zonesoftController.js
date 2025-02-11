// zoneSoftController.js
const axios = require("axios")
const crypto = require("crypto")
const Product = require("../models/Product")
const Order = require("../models/Order")

// Recupera as variáveis de ambiente
const clientId = process.env.ZONESOFT_CLIENT_ID
const appKey = process.env.ZONESOFT_APP_KEY
const secretKey = process.env.ZONESOFT_APP_SECRET
const appName = "Japizza"
const apiUrlOrder = "https://zsroi.zonesoft.org/v1.0/integration/order"
const apiUrlMenu = "https://zsroi.zonesoft.org/v1.0/integration/menu"

// Função para gerar a assinatura HMAC
function generateHmacSignature(body, secret) {
    return crypto.createHmac("sha256", secret).update(body).digest("hex")
}

/**
 * Função para sincronizar o menu com a ZoneSoft.
 * Ela busca os produtos ativos (status "show") no MongoDB, monta o objeto JSON
 * com a estrutura exigida e envia via POST para o endpoint de menu da ZoneSoft.
 */
const zoneSoftMenu = async (req, res) => {
    try {
        console.log("Iniciando sincronização do menu...", req.params)
        // Consulta os produtos ativos
        const products = await Product.find({ status: "show" })

        // Monta a estrutura do menu – neste exemplo, todos os produtos são agrupados na família "Pizzas".
        const menu = {
            families: [
                {
                    id: "cat1",
                    name: "Pizzas",
                    subfamilies: [],
                    products: products.map(prod => ({
                        id: prod.productId || prod._id.toString(),
                        name: prod.title.pt,
                        price: Math.round(prod.prices.price * 100), // converte para centavos
                        tax_rate: "0.00", // ajuste conforme necessário
                        imagem_url: prod.image[0],
                        is_alcohol: 0,
                        description: prod.description.pt
                    }))
                }
            ]
        }

        const body = JSON.stringify(menu)
        const signature = generateHmacSignature(body, secretKey)
        console.log("Enviando menu para ZoneSoft:", body)
        console.log("Assinatura HMAC:", signature)

        // Envia o menu para o endpoint da ZoneSoft via POST
        const response = await axios.post(apiUrlMenu, body, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": appKey,
                "X-Integration-Signature": signature
            }
        })

        console.log("Resposta da API de menu:", response.data)
        res.status(200).json(response.data)
    } catch (error) {
        console.error("Erro ao sincronizar o menu:", error.response ? error.response.data : error.message)
        res.status(500).json({ error: "Erro ao sincronizar o menu", details: error.response ? error.response.data : error.message })
    }
}

/**
 * Função para enviar um pedido (order) para a ZoneSoft.
 * Ela busca um pedido na collection Orders (com status "Pago") baseado no orderCode
 * recebido via parâmetro (req.params.orderCode), monta o objeto JSON conforme o modelo da ZoneSoft
 * e envia via POST para o endpoint de pedidos.
 */
const zoneSoftOrder = async (req, res) => {
    try {
        // Recebe o orderCode via parâmetro da URL
        const { orderCode } = req.params
        console.log("orderCode para enviar pedido para ZoneSoft:", orderCode)
        const order = await Order.findOne({ orderCode: orderCode, status: "Pago" })
        if (!order) {
            return res.status(404).json({ error: "Order não encontrado ou não foi pago" })
        }

        console.log("Order encontrado:", order.orderCode)

        // Considera que o pedido possui um array "cart" com pelo menos um objeto contendo as informações do cliente e dos produtos.
        const cartInfo = order.cart[0] || {}
        const customerInfo = cartInfo.user_info || {}

        // Mapeia os produtos do pedido para a estrutura exigida pela ZoneSoft
        const productItems = (cartInfo.cart || []).map(item => ({
            quantity: item.quantity,
            price: Math.round(item.price * 100), // converte para centavos
            discount: item.prices.discount || 0,
            name: item.title,
            id: item.productId,
            attributes: [] // Se houver atributos, adicione-os aqui conforme necessário
        }))

        // Monta o objeto do pedido conforme o exemplo da documentação
        const zonesoftOrderData = {
            order_id: order.orderCode.toString(),
            store_id: clientId,
            type_order: cartInfo.shippingOption === "shipping" ? "DELIVERY" : "PICKUP",
            order_time: new Date(order.createdAt).toISOString().slice(0, 19).replace("T", " "),
            // Estima o horário de retirada com 30 minutos de acréscimo (ajuste conforme sua lógica)
            estimated_pickup_time: new Date(new Date(order.createdAt).getTime() + 30 * 60000)
                .toISOString().slice(0, 19).replace("T", " "),
            currency: "EUR",
            delivery_fee: cartInfo.shippingCost || 0,
            courier: {
                name: "", // Preencha se houver dados do entregador
                phone_number: "",
                license_plate: ""
            },
            customer: {
                name: customerInfo.name,
                phone: customerInfo.contact,
                nif: "", // Se houver NIF, adicione-o aqui
                email: customerInfo.email
            },
            products: productItems,
            obs: order.customerTrns ? order.customerTrns.join(" ") : "",
            orderIsAlreadyPaid: true,
            payment_type: 1, // Ajuste conforme necessário (1 - dinheiro, etc.)
            delivery_address: {
                label: customerInfo.address,
                latitude: "", // Adicione se disponível
                longitude: ""
            },
            is_picked_up_by_customer: cartInfo.shippingOption !== "shipping",
            discounted_products_total: 0, // Se houver desconto, ajuste aqui
            total_customer_to_pay: order.total,
            payment_charges: {
                total: order.amount,
                sub_total: Math.round((cartInfo.subTotal || 0) * 100),
                tax: 0,
                total_fee: 0,
                total_fee_tax: 0,
                bag_fee: 0,
                delivery_fee: (cartInfo.shippingCost || 0) * 100,
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

        // Envia o pedido para o endpoint da ZoneSoft via POST
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
        let details = {}
        if (error.response) {
            details = {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            }
        } else if (error.request) {
            details = { request: error.request }
        } else {
            details = { message: error.message }
        }
        res.status(500).json({ error: "Erro ao enviar o pedido", details: details })
    }
}

const zoneSoftLogin = async (req, res) => {
    try {
        const data = req.body
        console.log("Dados de login recebidos: ", data)

        const { app_store_username, app_store_secret } = data

        if (app_store_username === appKey && app_store_secret === secretKey) {
            const token = "TOKEN_TESTE"
            res.status(200).json({
                message: "Login realizado com sucesso.",
                token: token
            })
        } else {
            res.status(401).json({ error: "Credenciais inválidas." })
        }
    } catch (error) {
        console.error("Erro ao fazer login: ", error)
        res.status(500).json({ error: "Erro ao fazer login." })
    }
}

const zoneSoftPos = async (req, res) => {
    try {
        const posData = req.body
        console.log("Dados de POS recebidos: ", posData)
        res.status(200).json({ message: "Confirmação de recebimento recebida com sucesso." })
    } catch (error) {
        console.error("Erro ao receber confirmação de recebimento: ", error)
        res.status(500).json({ error: "Erro ao receber confirmação de recebimento." })
    }
}

module.exports = {
    zoneSoftLogin,
    zoneSoftMenu,
    zoneSoftOrder,
    zoneSoftPos
}
