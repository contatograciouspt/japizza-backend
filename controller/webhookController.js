// const Webhook = require("../models/Webhook")
// const verificationToken = process.env.VERIFICATION_TOKEN
// const Order = require("../models/Order")
// const { zoneSoftOrder } = require("./zonesoftController")

// const webhookConnection = async (req, res) => {
//     console.log("Recebendo verificação do webhook...", req.params)
//     res.status(200).json({ Key: verificationToken })
// }

// const webhookEvents = async (req, res) => {
//     const data = req.body
//     console.log("Webhook recebido: ", data)

//     try {
//         switch (data.EventTypeId) {
//             case 1796: // Transaction Payment Created
//                 console.log("O pagamento do cliente foi efetuado com sucesso: ", data)
//                 const newWebhook = new Webhook(data)
//                 await newWebhook.save()
//                 console.log("Evento de pagamento salvo com sucesso: ", newWebhook)

//                 const customerOrderCode = data.EventData?.OrderCode
//                 console.log("OrderCode do cliente: ", customerOrderCode)
//                 if (customerOrderCode) {
//                     // Encontre o usuário pela orderCode para atualizar o status de pago em orders
//                     const updatedOrder = await Order.findOne({ orderCode: customerOrderCode })

//                     if (updatedOrder) {
//                         console.log(`Ordem encontrada com sucesso, atualizando status para Pago ${updatedOrder.orderCode}`)
//                         updatedOrder.status = 'Pago'
//                         await updatedOrder.save()
//                         console.log(`Status da ordem ${updatedOrder.orderCode} atualizado para Pago`)

//                         // **Chama a função zoneSoftOrder para enviar o pedido**
//                         try {
//                             console.log(`Iniciando envio para ZoneSoft: ${customerOrderCode}`)
//                             await zoneSoftOrder({ params: { orderCode: customerOrderCode } }, {
//                                 status: (code) => ({
//                                     json: (obj) => {
//                                         console.log(`Simulated response with status ${code}`, obj)
//                                         return { success: true }
//                                     }
//                                 })
//                             })

//                         } catch (error) {
//                             console.error("Erro ao enviar:", error)
//                         }
//                     } else {
//                         console.log(`Nenhuma ordem encontrada com o OrderCode: ${customerOrderCode}`)
//                     }
//                 } else {
//                     console.log("Email do cliente não encontrado no webhook data.")
//                 }
//                 break

//             case 1797: // Transaction Reversal Created
//                 console.log("Um reembolso do cliente foi efetuado com sucesso: ", data)
//                 break
//             case 1798: // Transaction Payment Failed
//                 console.log("O pagamento de um cliente falhou: ", data)
//                 break
//             default:
//                 console.log("Evento desconhecido: ", data)
//                 break
//         }

//         res.status(200).json({ message: "Webhook recebido com sucesso." })
//     } catch (error) {
//         console.error("Erro ao processar webhook: ", error)
//         res.status(500).json({ message: "Erro ao processar webhook" })
//     }
// }

// module.exports = { webhookEvents, webhookConnection }

const Webhook = require("../models/Webhook")
const verificationToken = process.env.VERIFICATION_TOKEN
const Order = require("../models/Order")
const { zoneSoftOrder } = require("./zonesoftController")

const webhookConnection = async (req, res) => {
    console.log("Recebendo verificação do webhook...", req.params)
    res.status(200).json({ Key: verificationToken })
}

const webhookPaymentCreated = async (req, res) => {
    try {
        const data = req.body
        console.log("Webhook de Pagamento Criado recebido:", JSON.stringify(data, null, 2))

        res.status(200).json({ message: "Webhook de Pagamento Criado recebido com sucesso." })

        (async () => {
            console.log("Processando evento de Pagamento Criado...")
            await Webhook.create(data)

            const customerOrderCode = data.EventData?.OrderCode
            if (!customerOrderCode) {
                console.log("Nenhum OrderCode encontrado no EventData para Pagamento Criado.")
                return
            }

            const updatedOrder = await Order.findOne({ orderCode: customerOrderCode })
            if (!updatedOrder) {
                console.log("Order não encontrada para o OrderCode:", customerOrderCode, " no evento de Pagamento Criado.")
                return
            }

            updatedOrder.status = "Pago"
            await updatedOrder.save()
            console.log("Status da ordem atualizado para Pago:", updatedOrder.orderCode, " após Pagamento Criado.")

            try {
                console.log("Enviando pedido para ZoneSoft:", customerOrderCode, " após Pagamento Criado.")
                await zoneSoftOrder(
                    { params: { orderCode: customerOrderCode } },
                    {
                        status: (code) => ({
                            json: (obj) => {
                                console.log(`Resposta do zoneSoftOrder status ${code}`, obj, " após Pagamento Criado.")
                            }
                        })
                    }
                )
            } catch (error) {
                console.error("Erro ao enviar pedido para ZoneSoft após Pagamento Criado:", error)
            }
        })().catch(err => {
            console.error("Erro no processamento assíncrono do webhook de Pagamento Criado:", err)
        })

    } catch (error) {
        console.error("Erro ao processar webhook de Pagamento Criado: ", error)
        return res.status(500).json({ message: "Erro ao processar webhook de Pagamento Criado" })
    }
}

const webhookPaymentReversed = async (req, res) => {
    try {
        const data = req.body
        console.log("Webhook de Reembolso Criado recebido:", JSON.stringify(data, null, 2))
        res.status(200).json({ message: "Webhook de Reembolso Criado recebido com sucesso." })

        (async () => {
            console.log("Processando evento de Reembolso Criado...")
            await Webhook.create(data)
            // Lógica adicional para reembolso, se necessário
        })().catch(err => {
            console.error("Erro no processamento assíncrono do webhook de Reembolso Criado:", err)
        })

    } catch (error) {
        console.error("Erro ao processar webhook de Reembolso Criado: ", error)
        return res.status(500).json({ message: "Erro ao processar webhook de Reembolso Criado" })
    }
}

const webhookPaymentFailed = async (req, res) => {
    try {
        const data = req.body
        console.log("Webhook de Pagamento Falhou recebido:", JSON.stringify(data, null, 2))
        res.status(200).json({ message: "Webhook de Pagamento Falhou recebido com sucesso." })

        (async () => {
            console.log("Processando evento de Pagamento Falhou...")
            await Webhook.create(data)
            // Lógica adicional para falha de pagamento, se necessário
        })().catch(err => {
            console.error("Erro no processamento assíncrono do webhook de Pagamento Falhou:", err)
        })

    } catch (error) {
        console.error("Erro ao processar webhook de Pagamento Falhou: ", error)
        return res.status(500).json({ message: "Erro ao processar webhook de Pagamento Falhou" })
    }
}


module.exports = { webhookPaymentCreated, webhookPaymentReversed, webhookPaymentFailed, webhookConnection }