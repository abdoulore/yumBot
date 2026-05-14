import Order from "../models/Order.js";
import { menuItems } from "../data/menu.js";

const pendingSelections = {};

const welcomeMessage = `Welcome to FoodieBot

Select 1 to Place an order
Select 99 to checkout order
Select 98 to see order history
Select 97 to see current order
Select 0 to cancel order`;

const getItemBasePrice = (item) => item.price || 0;

const formatPrice = (price) => `₦${price}`;

const formatMenu = () => {
  return menuItems
    .map((item) => {
      if (item.price) {
        return `${item.id}. ${item.name} - ${formatPrice(item.price)}`;
      }

      const firstOptionGroup = Object.values(item.options || {})[0] || [];
      const prices = firstOptionGroup
        .filter((option) => typeof option === "object")
        .map((option) => option.price);

      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        return `${item.id}. ${item.name} - from ${formatPrice(minPrice)}`;
      }

      return `${item.id}. ${item.name}`;
    })
    .join("\n");
};

const formatOrder = (order) => {
  if (!order || order.items.length === 0) {
    return "Your current order is empty";
  }

  const items = order.items
    .map((item, index) => {
      const options = item.selectedOptions
        ? Object.entries(item.selectedOptions)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ")
        : "";

      return `${index + 1}. ${item.name} x${item.quantity} - ₦${
        item.price * item.quantity
      }${options ? ` (${options})` : ""}`;
    })
    .join("\n");

  return `${items}\n\nTotal: ₦${order.total}`;
};

const addItemToOrder = async (req, res, selectedItem, selectedOptions, finalPrice) => {
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

  const itemPrice = finalPrice || getItemBasePrice(selectedItem);

  order.items.push({
    menuItemId: selectedItem.id,
    name: selectedItem.name,
    price: itemPrice,
    quantity: 1,
    selectedOptions
  });

  order.total = order.items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  await order.save();

  req.userSession.stage = "ordering";
  await req.userSession.save();

  const optionsText = Object.entries(selectedOptions || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return res.json({
    reply: `${selectedItem.name} added to your order.${
      optionsText ? `\n\n${optionsText}` : ""
    }

Reply with another food number to add more, 97 to view order, or 99 to checkout.`
  });
};

export const handleChat = async (req, res) => {
  try {
    const { message } = req.body;
    const input = String(message || "").trim();

    const stage = req.userSession.stage || "main";

    if (!input) {
      return res.json({ reply: welcomeMessage });
    }

    if ((input === "1" && stage === "main") || input === "start_order") {
      req.userSession.stage = "ordering";
      await req.userSession.save();

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
        reply: `${formatOrder(order)}

Select another food number to continue ordering
Select 99 to checkout
Select 0 to cancel order`
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

      const history = orders
        .map((order, index) => {
          return `${index + 1}. ${order.status.toUpperCase()} - ₦${order.total}`;
        })
        .join("\n");

      return res.json({ reply: history });
    }

    if (input === "0") {
      req.userSession.stage = "main";
      await req.userSession.save();

      delete pendingSelections[req.sessionId];

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
      req.userSession.stage = "main";
      await req.userSession.save();

      delete pendingSelections[req.sessionId];

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

    const pending = pendingSelections[req.sessionId];

    if (pending) {
      const selectedIndex = Number(input) - 1;

      if (
        Number.isNaN(selectedIndex) ||
        selectedIndex < 0 ||
        selectedIndex >= pending.values.length
      ) {
        return res.json({
          reply: "Invalid option selection. Please choose a valid option number."
        });
      }

      const selectedValue = pending.values[selectedIndex];

      let optionName;
      let finalPrice = pending.item.price || 0;

      if (typeof selectedValue === "object") {
        optionName = selectedValue.name;
        finalPrice = selectedValue.price;
      } else {
        optionName = selectedValue;
      }

      const selectedOptions = {
        [pending.optionKey]: optionName
      };

      delete pendingSelections[req.sessionId];

      return await addItemToOrder(
        req,
        res,
        pending.item,
        selectedOptions,
        finalPrice
      );
    }

    const selectedItem = menuItems.find((item) => item.id === Number(input));

    if (selectedItem) {
      const optionEntries = Object.entries(selectedItem.options || {});

      if (optionEntries.length > 0) {
        const [optionKey, values] = optionEntries[0];

        pendingSelections[req.sessionId] = {
          item: selectedItem,
          optionKey,
          values
        };

        const optionsText = values
          .map((value, index) => {
            if (typeof value === "object") {
              return `${index + 1}. ${value.name} - ${formatPrice(value.price)}`;
            }

            return `${index + 1}. ${value}`;
          })
          .join("\n");

        return res.json({
          reply: `Select ${optionKey} for ${selectedItem.name}:\n\n${optionsText}`
        });
      }

      return await addItemToOrder(req, res, selectedItem, {}, selectedItem.price);
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