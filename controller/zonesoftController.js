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
        // 1. Valida o parâmetro orderCode
        const { orderCode } = req.params;
        if (!orderCode) {
            return res.status(400).json({ error: "orderCode não fornecido." });
        }

        // 2. Busca a order com orderCode e status "Pago"
        const order = await Order.findOne({ orderCode: orderCode, status: "Pago" });
        if (!order) {
            return res.status(404).json({ error: "Order não encontrado ou não foi pago." });
        }

        // 3. Carrega os dados completos da order (converte para objeto simples, se necessário)
        const orderData = JSON.parse(JSON.stringify(order));

        // 4. Usa o dynamicDescriptor (nome do produto) da order para fazer o mapeamento
        const dynamicDescriptor = orderData.dynamicDescriptor;
        if (!dynamicDescriptor) {
            throw new Error("dynamicDescriptor não informado no pedido.");
        }
        const descriptorNorm = dynamicDescriptor.trim().toLowerCase();

        // 5. Busca o menu sincronizado – assumindo que o menu mais recente é o utilizado
        const Menu = require("../models/Menu");
        const menuDoc = await Menu.findOne({}, {}, { sort: { createdAt: -1 } });
        if (!menuDoc || !menuDoc.families) {
            throw new Error("Menu não encontrado ou sem famílias.");
        }

        // 6. Itera pelas families e subfamilies do menu para encontrar o produto correspondente
        let matchedMenuProduct = null;
        for (const family of menuDoc.families) {
            if (family.subfamilies && Array.isArray(family.subfamilies)) {
                for (const sub of family.subfamilies) {
                    if (sub.products && Array.isArray(sub.products)) {
                        for (const prod of sub.products) {
                            // Supondo que cada produto seja um objeto com "name" e "id"
                            if (prod.name && prod.name.trim().toLowerCase().includes(descriptorNorm)) {
                                matchedMenuProduct = prod;
                                break;
                            }
                        }
                    }
                    if (matchedMenuProduct) break;
                }
            }
            if (matchedMenuProduct) break;
        }

        if (!matchedMenuProduct) {
            throw new Error(`Nenhum produto correspondente encontrado no menu para: ${dynamicDescriptor}`);
        }

        // 7. Monta o item do pedido com os dados obtidos do menu
        const productItem = {
            quantity: 1,  // Assumindo 1 para o exemplo; se o pedido contiver mais itens, adapte a lógica
            price: Number(matchedMenuProduct.price), // Pressupõe que o preço no menu esteja em centavos
            discount: 0,
            name: matchedMenuProduct.name,
            id: matchedMenuProduct.id,  // Esse é o identificador que a ZoneSoft espera
            attributes: [] // Adicione atributos se aplicável
        };

        // 8. Monta o objeto do pedido conforme a estrutura exigida pela ZoneSoft
        const zonesoftOrderData = {
            order_id: order.orderCode.toString(),
            store_id: clientId,
            type_order: orderData.shippingOption === "shipping" ? "DELIVERY" : "PICKUP",
            order_time: new Date(order.createdAt).toISOString().slice(0, 19).replace("T", " "),
            estimated_pickup_time: new Date(new Date(order.createdAt).getTime() + 30 * 60000)
                .toISOString().slice(0, 19).replace("T", " "),
            currency: "EUR",
            delivery_fee: Math.round((orderData.shippingCost || 0) * 100),
            customer: {
                name: orderData.customer.name,
                phone: orderData.customer.contact,
                nif: orderData.customer.nif || "",
                email: orderData.customer.email
            },
            products: [productItem],
            obs: orderData.customerTrns ? orderData.customerTrns.join(" ") : "",
            orderIsAlreadyPaid: orderData.orderIsAlreadyPaid === true,
            payment_type: orderData.payment_type || 1,
            delivery_address: {
                label: orderData.customer.address,
                latitude: "",
                longitude: ""
            },
            is_picked_up_by_customer: orderData.shippingOption !== "shipping",
            discounted_products_total: 0,
            total_customer_to_pay: Math.round(orderData.total),
            payment_charges: {
                total: Math.round(orderData.amount),
                sub_total: Math.round((orderData.subTotal || 0) * 100),
                tax: 0,
                total_fee: 0,
                total_fee_tax: 0,
                bag_fee: 0,
                delivery_fee: Math.round((orderData.shippingCost || 0) * 100),
                delivery_fee_tax: 0,
                small_order_fee: 0,
                small_order_fee_tax: 0,
                pick_and_pack_fee: 0,
                pick_and_pack_fee_tax: 0,
                tip: 0
            }
        };

        // 9. Converte o objeto em JSON e gera a assinatura HMAC
        const body = JSON.stringify(zonesoftOrderData);
        const signature = generateHmacSignature(body, secretKey);
        console.log("Enviando pedido para ZoneSoft com os dados mapeados...");
        console.log("Assinatura HMAC:", signature);

        // 10. Envia o pedido para o endpoint da ZoneSoft
        const response = await axios.post(apiUrlOrder, body, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": appKey,
                "X-Integration-Signature": signature
            }
        });

        console.log("Resposta da API de pedido:", response.data);
        return res.status(200).json(response.data);
    } catch (error) {
        console.error("Erro ao enviar o pedido (nova versão):", error.response ? error.response.data : error.message);
        return res.status(500).json({ error: "Erro ao enviar o pedido (nova versão)", details: error.message });
    }
};


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
