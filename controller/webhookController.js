const Webhook = require("../models/Webhook");
const OrderCustomizado = require("../models/OrderCustomizado");
const verificationToken = process.env.VERIFICATION_TOKEN;
const axios = require("axios");
const Order = require("../models/Order");
const crypto = require("crypto");

//ZoneSoft config
const zoneSoftApiUrl = "https://api.zonesoft.org/v2.1";
const zoneSoftNif = process.env.ZONESOFT_NIF;
const zoneSoftNome = process.env.ZONESOFT_NOME;
const zoneSoftPassword = process.env.ZONESOFT_PASSWORD;
const zoneSoftLoja = process.env.ZONESOFT_LOJA;

const webhookConnection = async (req, res) => {
    console.log("Recebendo verificação do webhook...", req.params);
    res.status(200).json({ Key: verificationToken });
};

const webhookEvents = async (req, res) => {
    const data = req.body;
    console.log("Webhook recebido: ", data);

    try {
        switch (data.EventTypeId) {
            case 1796: // Transaction Payment Created
                console.log("O pagamento do cliente foi efetuado com sucesso: ", data);
                const newWebhook = new Webhook(data);
                await newWebhook.save();
                console.log("Evento de pagamento salvo com sucesso: ", newWebhook);

                const customerOrderCode = data.EventData?.OrderCode;
                console.log("OrderCode do cliente: ", customerOrderCode);
                if (customerOrderCode) {
                    // Encontre o usuário pela orderCode para atualizar o status de pago em orders
                    const updatedOrder = await Order.findOne({ orderCode: customerOrderCode });

                    if (updatedOrder) {
                        console.log(`Ordem encontrada com sucesso, atualizando status para Pago ${updatedOrder.orderCode}`);
                        updatedOrder.status = 'Pago';
                        await updatedOrder.save();
                        console.log(`Status da ordem ${updatedOrder.orderCode} atualizado para Pago`);

                        // try {
                        //     // 1. Autenticação na ZoneSoft
                        //     const authResponse = await axios.post(
                        //         `${zoneSoftApiUrl}/auth/authenticate`,
                        //         {
                        //             "user": {
                        //                 "nif": zoneSoftNif,
                        //                 "nome": zoneSoftNome,
                        //                 "password": zoneSoftPassword,
                        //                 "loja": zoneSoftLoja
                        //             }
                        //         }
                        //     );
                        //     const authHash = authResponse.data?.auth_hash;
                        //     if (!authHash) {
                        //         throw new Error("Falha ao autenticar na ZoneSoft");
                        //     }

                        //     // 2. Construção do objeto de venda usando dados da collection "orders"
                        //     const saleItems = updatedOrder.merchantTrns.split(",").map((item) => {
                        //         const [productName, quantityPart] = item.trim().split(" - Quantidade: ");
                        //         const quantity = parseInt(quantityPart, 10) || 1;
                        //         return {
                        //             produto_codigo: "PROD123", // Código do produto fixo (pode precisar adaptar isso)
                        //             descricao: productName.trim(),
                        //             quantidade: quantity,
                        //             valor_unitario: parseFloat((updatedOrder.amount / 100).toFixed(2)),
                        //         };
                        //     });

                        //     const saleData = {
                        //         auth_hash: authHash,
                        //         sale: {
                        //             cliente: updatedOrder._id, //Usando _id do pedido como id do cliente
                        //             valor_total: parseFloat((updatedOrder.amount / 100).toFixed(2)),
                        //             data_hora: new Date(updatedOrder.createdAt).toISOString(),
                        //             itens: saleItems,
                        //             referencia: updatedOrder.invoice, // Usando o invoice do pedido
                        //             origem: "e-commerce",
                        //         },
                        //     };
                        //     // 3. Envio da venda para ZoneSoft
                        //     const zoneSoftResponse = await axios.post(`${zoneSoftApiUrl}/sales`, saleData);
                        //     console.log("Venda enviada com sucesso para a ZoneSoft: ", zoneSoftResponse.data);
                        // } catch (zoneSoftError) {
                        //     console.error("Erro ao enviar venda para ZoneSoft:", zoneSoftError);
                        //     res.status(500).json({ message: "Erro ao enviar venda para ZoneSoft" });
                        //     return;
                        // }
                    } else {
                        console.log(`Nenhuma ordem encontrada com o OrderCode: ${customerOrderCode}`);
                    }
                } else {
                    console.log("Email do cliente não encontrado no webhook data.");
                }
                break;

            case 1797: // Transaction Reversal Created
                console.log("Um reembolso do cliente foi efetuado com sucesso: ", data);
                break;
            case 1798: // Transaction Payment Failed
                console.log("O pagamento de um cliente falhou: ", data);
                break;
            default:
                console.log("Evento desconhecido: ", data);
                break;
        }

        res.status(200).json({ message: "Webhook recebido com sucesso." });
    } catch (error) {
        console.error("Erro ao processar webhook: ", error);
        res.status(500).json({ message: "Erro ao processar webhook" });
    }
};

module.exports = { webhookEvents, webhookConnection };