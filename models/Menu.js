// models/Menu.js
const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
    {
        families: {
            type: Array,
            required: false,
        },
        products: {
            type: Array,
            required: false,
        }
    },
    { timestamps: true }
);

const Menu = mongoose.model("Menu", menuSchema);
module.exports = Menu;
