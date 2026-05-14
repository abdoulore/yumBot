import Order from "../models/Order.js";
import { menuItems } from "../data/menu.js";

const userStages = {};

const welcomeMessage = `Welcome to FoodieBot

Select 1 to Place an order
Select 99 to checkout order
Select 98 to see order history
Select 97 to see current order
Select 0 to cancel order`;

const formatMenu = () => {
    return menuItems
        .map((item) => `${item.id}. ${item.name} - ₦${item.price}`)
        .join("\n");
};

const formatOrder = (order) => {
    if (!order || order.items.length === 0) {
        return "Your current order is empty";
    }

    const items = order.items.map((item, index) => {
        const options = item.selectedOptions
            ? Object.entries(item.selectedOptions)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ")
            : "";

        return `${index + 1}. ${item.name} x${item.quantity} - ₦${item.price * item.quantity
            }${options ? ` (${options})` : ""}`;
    }).join("\n");

    return `${items}\n\nTotal: ₦${order.total}`;
};

export const handleChat = async (req, res) => {
    try {
        const { message } = req.body;
        const input = String(message || "").trim();

        const stage = userStages[req.sessionId] || "main";

        if (!input) {
            return res.json({ reply: welcomeMessage });
        }

        if (
            (input === "1" && stage === "main") ||
            input === "reset_menu"
        ) {

            userStages[req.sessionId] = "ordering";

            return res.json({
                reply: `Here is our Nigerian food menu:\n\n${formatMenu()}\n\nReply with the item number to add it to your order.`
            });
        }

        if (input === "97") {

            const order = await Order.findOne({
                sessionId: req.sessionId,
                status: "pending"
            });

            return res.json({
                reply: `${formatOrder(order)}\n\nSelect 1 to continue ordering\nSelect 99 to checkout\nSelect 0 to cancel order`
            });
        }

        if (input === "98") {
            const orders = await Order.find({
                sessionId: req.sessionId,
                status: { $in: ["paid", "cancelled"] }
            }).sort({ createdAt: -1 });

            if (orders.length === 0) {
                return res.json({ reply: "You have no past orders yet" });
            }

            const history = orders.map((order, index) => {
                return `${index + 1}. ${order.status.toUpperCase()} - ₦${order.total} - ${order.items.length} item(s)`;
            }).join("\n");

            return res.json({ reply: history });
        }

        if (input === "0") {
            userStages[req.sessionId] = "main";

            const order = await Order.findOne({
                sessionId: req.sessionId,
                status: "pending"
            });

            if (!order || order.items.length === 0) {
                return res.json({ reply: "No current order to cancel" });
            }

            order.status = "cancelled";
            await order.save();

            return res.json({ reply: "Order cancelled" });
        }

        if (input === "99") {
            userStages[req.sessionId] = "main";

            const order = await Order.findOne({
                sessionId: req.sessionId,
                status: "pending"
            });

            if (!order || order.items.length === 0) {
                return res.json({ reply: "No order to place" });
            }

            return res.json({
                reply: `Order placed.\nTotal: ₦${order.total}\n\nClick the payment button to complete your order.`,
                checkout: true,
                order
            });
        }

        const selectedItem = menuItems.find((item) => item.id === Number(input));

        if (selectedItem && stage === "ordering") {
            let order = await Order.findOne({
                sessionId: req.sessionId,
                status: "pending"
            });

            if (!order) {
                order = await Order.create({
                    sessionId: req.sessionId,
                    items: [],
                    total: 0
                });
            }

            const selectedOptions = {};

            if (selectedItem.options) {
                for (const [key, values] of Object.entries(selectedItem.options)) {
                    selectedOptions[key] = values[0];
                }
            }

            order.items.push({
                menuItemId: selectedItem.id,
                name: selectedItem.name,
                price: selectedItem.price,
                quantity: 1,
                selectedOptions
            });

            order.total = order.items.reduce((sum, item) => {
                return sum + item.price * item.quantity;
            }, 0);

            await order.save();

            userStages[req.sessionId] = "ordering";

            return res.json({
                reply: `${selectedItem.name} added to your order.\n\nReply with another food number to add more, 97 to view order, or 99 to checkout.`
            });
        }

        return res.json({
            reply: "Invalid selection. Please choose a valid number.\n\n" + welcomeMessage
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            reply: "Something went wrong. Please try again."
        });
    }
};