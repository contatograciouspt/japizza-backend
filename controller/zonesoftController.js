// zoneSoftController.js
const axios = require("axios")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const Product = require("../models/Product")
const Order = require("../models/Order")

// Recupera as variáveis de ambiente
const clientId = process.env.ZONESOFT_CLIENT_ID
const appKey = process.env.ZONESOFT_APP_KEY
const secretKey = process.env.ZONESOFT_APP_SECRET
const appName = "Japizza"
const apiUrlOrder = "https://zsroi.zonesoft.org/v1.0/integration/order"
// Atenção: verifique se a URL configurada para sincronização de menu está correta na plataforma ZoneSoft
const apiUrlMenu = "https://zsroi.zonesoft.org/v1.0/integration/sync/menu"

// Função para gerar a assinatura HMAC
function generateHmacSignature(body, secret) {
    return crypto.createHmac("sha256", secret).update(body).digest("hex")
}

/**
 * Função interna que realiza a sincronização do menu.
 * Recebe o token (obtido via login) e usa-o no header da requisição.
 */
async function syncMenuWithToken(token) {
    // Busca os produtos ativos e popula a propriedade "categories"
    const products = await Product.find({ status: "show" }).populate("categories")

    if (!products || products.length === 0) {
        return { message: "Nenhum produto ativo para sincronizar." }
    }

    // Agrupa os produtos por categoria
    const familiesMap = {}
    products.forEach(product => {
        // Usa a primeira categoria, ou atribui "Padrão" se não houver
        const categoryObj = product.categories && product.categories.length > 0
            ? product.categories[0]
            : { _id: "default", name: "Padrão" }

        const catId = categoryObj._id.toString()
        const catName = categoryObj.name || "Padrão"

        if (!familiesMap[catId]) {
            familiesMap[catId] = {
                id: catId,
                name: catName,
                subfamilies: [],
                products: []
            }
        }

        familiesMap[catId].products.push({
            id: product.productId || product._id.toString(),
            name: product.title?.pt,
            price: Math.round(product.prices.price * 100).toString(), // preço em centavos
            tax_rate: "0.00", // ajuste conforme necessário
            imagem_url: product.image[0] || "",
            description: product.description?.pt
        })
    })

    // Monta o objeto do menu com a estrutura exigida
    const menu = { families: Object.values(familiesMap) }
    const bodyStr = JSON.stringify(menu)
    const signature = generateHmacSignature(bodyStr, secretKey)

    console.log("Enviando menu para ZoneSoft:", bodyStr)
    console.log("Assinatura HMAC:", signature)

    // Realiza a requisição POST para sincronizar o menu usando o token recebido
    const response = await axios.post(apiUrlMenu, bodyStr, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": token,
            // "X-Integration-Signature": signature,
        },
    })

    return response.data
}

/**
 * Endpoint para sincronização do menu.
 * Espera receber o token via query (ou params) e o repassa para a função interna.
 */
const zoneSoftMenu = async (req, res) => {
    try {
        // Obtém o token da query (ou de req.params)
        const token = req.query.token || req.params.token
        if (!token) {
            return res.status(400).json({ error: "Token não fornecido." })
        }
        const result = await syncMenuWithToken(token)
        res.status(200).json(result)
    } catch (error) {
        console.error("Erro ao sincronizar o menu:", error.response ? error.response.data : error.message)
        res.status(500).json({ error: "Erro ao sincronizar o menu", details: { message: error.message } })
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
            // Cria um payload com informações relevantes
            const payload = {
                app: appName,
                clientId: clientId,
                timestamp: Date.now()
            }
            // Gera o token JWT com expiração de 1 hora
            const token = jwt.sign(payload, secretKey, { expiresIn: "1h" })

            // Opcional: chama a sincronização do menu utilizando o token gerado
            try {
                const syncResult = await syncMenuWithToken(token)
                console.log("Sincronização do menu realizada com sucesso:", syncResult)
            } catch (syncError) {
                console.error("Erro na sincronização do menu durante o login:",
                    syncError.response ? syncError.response.data : syncError.message)
            }

            return res.status(200).json({
                body: {
                    access_token: token,
                    expires_in: 3600000
                },
                header: {
                    statusCode: 200,
                    statusMessage: "OK",
                    status: "HTTP/1.1 200 OK"
                }
            })
        } else {
            return res.status(401).json({ error: "Credenciais inválidas." })
        }
    } catch (error) {
        console.error("Erro ao fazer login:", error)
        res.status(500).json({ error: "Erro ao fazer login." })
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
