// const mongoose = require("mongoose");
// const AutoIncrement = require("mongoose-sequence")(mongoose);

// const orderSchema = new mongoose.Schema(
//     {
//         amount: {
//             type: Number,
//             required: true,
//         },
//         customerTrns: {
//             type: String,
//             required: false,
//         },
//         email: {
//             type: String,
//             required: false,
//         },
//         fullName: {
//             type: String,
//             required: false,
//         },
//         phone: {
//             type: String,
//             required: false,
//         },
//         requestLang: {
//             type: String,
//             required: false,
//         },
//         dynamicDescriptor: {
//             type: String,
//             required: false,
//         },
//         paymentTimeout: {
//             type: Number,
//             required: false,
//         },
//         preauth: {
//             type: Boolean,
//             required: false,
//         },
//         allowRecurring: {
//             type: Boolean,
//             required: false,
//         },
//         maxInstallments: {
//             type: Number,
//             required: false,
//         },
//         merchantTrns: {
//             type: String,
//             required: false,
//         },
//         paymentNotification: {
//             type: Boolean,
//             required: false,
//         },
//         tipAmount: {
//             type: Number,
//             required: false,
//         },
//         disableExactAmount: {
//             type: Boolean,
//             required: false,
//         },
//         disableCash: {
//             type: Boolean,
//             required: false,
//         },
//         disableWallet: {
//             type: Boolean,
//             required: false,
//         },
//         orderCode:{
//             type: Number,
//             required: false,
//         },
//         sourceCode: {
//             type: String,
//             required: false,
//         },
//         status: {
//             type: String,
//             enum: ["Pendente", "Pago", "Cancelado"],
//             default: "Pendente",
//         },
//     },
//     {
//         timestamps: true,
//     }
// );

// const OrderCustomizado = mongoose.model(
//     "Order",
//     orderSchema.plugin(AutoIncrement, {
//         inc_field: "invoice",
//         start_seq: 10000,
//     })
// );
// module.exports = OrderCustomizado;