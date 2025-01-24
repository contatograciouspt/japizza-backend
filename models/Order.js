const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: false,
        },
        orderCode: {
            type: Number,
            required: false,
        },
        invoice: {
            type: Number,
            required: false,
        },
        cart: [{}],
        user_info: {
            name: {
                type: String,
                required: false,
            },
            email: {
                type: String,
                required: false,
            },
            contact: {
                type: String,
                required: false,
            },
            address: {
                type: String,
                required: false,
            },
            city: {
                type: String,
                required: false,
            },
            country: {
                type: String,
                required: false,
            },
            zipCode: {
                type: String,
                required: false,
            },
        },
        subTotal: {
            type: Number,
            required: true,
        },
        shippingCost: {
            type: Number,
            required: false,
        },
        discount: {
            type: Number,
            required: false,
            default: 0,
        },

        total: {
            type: Number,
            required: false,
        },
        shippingOption: {
            type: String,
            required: false,
        },
        paymentMethod: {
            type: String,
            required: false,
        },
        cardInfo: {
            type: Object,
            required: false,
        },
        status: {
            type: String,
            enum: ["Pendente", "Pago", "Cancelado"],
        },
    },
    {
        timestamps: true,
    }
);

const Order = mongoose.model(
    "Order",
    orderSchema.plugin(AutoIncrement, {
        inc_field: "invoice",
        start_seq: 10000,
    })
);
module.exports = Order;
