const Webhook = require("../models/Webhook")
const Order = require("../models/Order")
const { zoneSoftOrder } = require("./zonesoftController")
const verificationToken = process.env.VERIFICATION_TOKEN

const webhookConnection = async (req, res) => {
    try {
        console.log("Recebendo verificação do webhook...", req.params)
        res.status(200).json({ Key: verificationToken })
    } catch (error) {
        console.error("Erro ao processar webhook: ", error)
        res.status(500).json({ message: "Erro ao processar webhook" })
    }
}

const webhookEvents = async (req, res) => {
    const data = req.body
    console.log("Webhook recebido: ", data)

    try {
        switch (data.EventTypeId) {
            case 1796: // Transaction Payment Created
                console.log("O pagamento do cliente foi efetuado com sucesso: ", data)
                console.log("Processando evento de Pagamento Criado...")
                try {
                    const newWebhook = new Webhook(data)
                    await newWebhook.save()
                    console.log("Evento de pagamento salvo com sucesso: ", newWebhook)

                    const customerOrderCode = data.EventData?.OrderCode
                    console.log("OrderCode do cliente: ", customerOrderCode)
                    if (customerOrderCode) {
                        const updatedOrder = await Order.findOne({ orderCode: customerOrderCode })

                        if (updatedOrder) {
                            console.log(`Ordem encontrada com sucesso, atualizando status para Pago ${updatedOrder.orderCode}`)
                            updatedOrder.status = 'Pago'
                            await updatedOrder.save()
                            console.log(`Status da ordem ${updatedOrder.orderCode} atualizado para Pago`)

                            try {
                                console.log(`Iniciando envio para ZoneSoft: ${customerOrderCode}`)
                                await zoneSoftOrder({ params: { orderCode: customerOrderCode } }, {
                                    status: (code) => ({
                                        json: (obj) => {
                                            console.log(`Simulated response with status ${code}`, obj)
                                            return { success: true }
                                        }
                                    })
                                })

                            } catch (error) {
                                console.error("Erro ao enviar para ZoneSoft:", error)
                            }
                        } else {
                            console.log(`Nenhuma ordem encontrada com o OrderCode: ${customerOrderCode}`)
                        }
                    } else {
                        console.log("Email do cliente não encontrado no webhook data.")
                    }
                } catch (asyncError) {
                    console.error("Erro no processamento assíncrono do webhook de Pagamento Criado:", asyncError)
                }
                break
            case 1797: // Transaction Reversal Created
                console.log("Um reembolso do cliente foi efetuado com sucesso: ", data)
                break
            case 1798: // Transaction Payment Failed
                console.log("O pagamento de um cliente falhou: ", data)
                break
            default:
                console.log("Evento desconhecido: ", data)
                break
        }
    } catch (error) { // Catch para erros *FORA* do IIFE, no fluxo principal do webhookEvents
        console.error("Erro ao processar webhook: ", error)
        res.status(500).json({ message: "Erro ao processar webhook", error: error.message })
    }
}

module.exports = { webhookEvents, webhookConnection }